import { type Address, type Hex, type PublicClient, type WalletClient } from 'viem';
import { BlockchainErrorHandler } from '../utils/blockchain-error-handler';

export interface TransactionResult {
    txHash: Hex;
    blockNumber: bigint;
}

/**
 * Executes a contract write transaction and waits for receipt
 */
export async function executeTransaction<T extends TransactionResult>(params: {
    publicClient: PublicClient;
    walletClient: WalletClient;
    account: Address;
    contractAddress: Address;
    abi: readonly unknown[];
    functionName: string;
    args: unknown[];
    value?: bigint;
    extractResult?: (receipt: Awaited<ReturnType<PublicClient['waitForTransactionReceipt']>>) => T;
    context?: string;
}): Promise<T> {
    try {
        const { publicClient, walletClient, account, contractAddress, abi, functionName, args, value, extractResult } = params;

        const writeParams: any = {
            address: contractAddress,
            abi: abi,
            functionName: functionName,
            args: args,
            account: account,
        };

        if (value !== undefined) {
            writeParams.value = value;
        }

        const txHash = await walletClient.writeContract(writeParams);

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        if (extractResult) {
            return extractResult(receipt) as T;
        }

        return {
            txHash,
            blockNumber: receipt.blockNumber,
        } as T;
    } catch (error: unknown) {
        throw BlockchainErrorHandler.handle(error, params.context || 'execute-transaction');
    }
}

