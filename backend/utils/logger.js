import AuditLog from '../models/AuditLog.js';

export const logAudit = async ({
  userId,
  username,
  action,
  entityName,
  entityId,
  oldValue,
  newValue,
  remarks,
}) => {
  try {
    const log = new AuditLog({
      userId,
      username,
      action,
      entityName,
      entityId,
      oldValue,
      newValue,
      remarks,
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Audit log creation failed:', error.message);
  }
};
