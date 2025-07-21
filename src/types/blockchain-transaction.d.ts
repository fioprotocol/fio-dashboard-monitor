export type BlockchainTransactionType = {
  id: number;
  status: number;
  createdAt: Date;
  eventStatus: number;
  statusNotes: string;
  data: string;
};

export type ChainTransactionResponseType = {
  query_time_ms: number;
  executed: boolean;
  trx_id: string;
  lib: number;
  cached_lib: boolean;
  actions: Array<{
    action_ordinal: number;
    creator_action_ordinal: number;
    act: {
      account: string;
      name: string;
      authorization: Array<{
        actor: string;
        permission: string;
      }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: any;
    };
    elapsed: string;
    account_ram_deltas?: Array<{
      account: string;
      delta: string;
    }>;
    '@timestamp': string;
    block_num: number;
    producer: string;
    trx_id: string;
    global_sequence: number;
    cpu_usage_us?: number;
    net_usage_words?: number;
    signatures?: string[];
    inline_count?: number;
    inline_filtered?: boolean;
    receipts: Array<{
      receiver: string;
      global_sequence: string;
      recv_sequence: string;
      auth_sequence: Array<{
        account: string;
        sequence: string;
      }>;
    }>;
    code_sequence: number;
    abi_sequence: number;
    act_digest: string;
    timestamp: string;
    ds_error?: boolean;
  }>;
  last_indexed_block: number;
  last_indexed_block_time: string;
};
