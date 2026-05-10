const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true
  },
  entity_type: {
    type: String,
    enum: ['Product', 'InstallationRequest', 'User', 'System'],
    required: true
  },
  entity_id: {
    type: mongoose.Schema.ObjectId,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Index for fast querying by user or entity
activityLogSchema.index({ user_id: 1, createdAt: -1 });
activityLogSchema.index({ entity_type: 1, entity_id: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
