-- PostgreSQL schema (optional)
CREATE TABLE IF NOT EXISTS unlimited_approvals (
    id SERIAL PRIMARY KEY,
    tx_hash VARCHAR(66) UNIQUE NOT NULL,
    owner VARCHAR(42) NOT NULL,
    spender VARCHAR(42) NOT NULL,
    value_raw TEXT NOT NULL,
    decimals INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    processed BOOLEAN DEFAULT FALSE,
    balance_raw TEXT,
    allowance_raw TEXT
);

CREATE INDEX idx_tx_hash ON unlimited_approvals(tx_hash);
CREATE INDEX idx_owner ON unlimited_approvals(owner);
CREATE INDEX idx_confirmed_at ON unlimited_approvals(confirmed_at);
CREATE INDEX idx_processed ON unlimited_approvals(processed);
