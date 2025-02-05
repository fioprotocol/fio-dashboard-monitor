export class BlockchainTransaction {
  static readonly STATUS = {
    NONE: 0,
    READY: 1,
    PENDING: 2,
    SUCCESS: 3,
    FAILED: 4,
    CANCEL: 5, // not used now
    RETRY: 6, // not used now
    EXPIRE: 7,
    RETRY_PROCESSED: 8, // not used now
  };
}
