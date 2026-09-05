import { getFinancialTransactions } from './actions'
import { FinancialClientWrapper } from './financial-client'

export default async function AdminFinancialPage() {
    const transactions = await getFinancialTransactions()

    return <FinancialClientWrapper initialTransactions={transactions} />
}