const mongoose = require('mongoose');
const config = require('../config');

// Define the approval schema
const approvalSchema = new mongoose.Schema({
  txHash: { type: String, required: true, unique: true },
  owner: { type: String, required: true },
  spender: { type: String, required: true },
  valueRaw: { type: String, required: true },
  decimals: { type: Number, required: true },
  blockNumber: { type: Number, required: true },
  detectedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date },
  processed: { type: Boolean, default: false },
  balanceRaw: { type: String },
  allowanceRaw: { type: String }
});

const Approval = mongoose.model('Approval', approvalSchema);

class DatabaseService {
  constructor() {
    this.Approval = Approval;
  }

  async connect() {
    try {
      await mongoose.connect(config.database.mongodbUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
      console.log('Connected to MongoDB');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      process.exit(1);
    }
  }

  async saveDetection(detection) {
    try {
      const approval = new this.Approval(detection);
      return await approval.save();
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error, ignore
        return null;
      }
      throw error;
    }
  }

  async updateConfirmation(txHash, confirmedAt) {
    return await this.Approval.findOneAndUpdate(
      { txHash },
      { confirmedAt },
      { new: true }
    );
  }

  async markAsProcessed(txHash) {
    return await this.Approval.findOneAndUpdate(
      { txHash },
      { processed: true },
      { new: true }
    );
  }

  async getPendingAndConfirmed() {
    return await this.Approval.find({}).sort({ detectedAt: -1 }).limit(100);
  }

  async findByTxHash(txHash) {
    return await this.Approval.findOne({ txHash });
  }
}

module.exports = new DatabaseService();
