const { ethers } = require('ethers');

function formatTokenAmount(amount, decimals) {
  try {
    const bnAmount = typeof amount === 'string' ? BigInt(amount) : amount;
    return ethers.formatUnits(bnAmount, decimals);
  } catch (error) {
    return '0';
  }
}

function parseTokenAmount(amount, decimals) {
  try {
    return ethers.parseUnits(amount, decimals);
  } catch (error) {
    return 0n;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  formatTokenAmount,
  parseTokenAmount,
  sleep
};
