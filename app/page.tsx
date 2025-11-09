"use client";
import { useEffect, useState } from "react";
import axios from "axios";

type AccountType = "SAVINGS" | "CURRENT";

interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface Account {
  account_id: number;
  customer_id: number;
  account_type: AccountType;
  balance: number;
  created_at: string; // now present in your schema
}

interface Transaction {
  id: number; // aliased from transaction_id
  account_id: number;
  transaction_type: string;
  amount: number;
  transaction_time: string;
}

interface AuditLog {
  id: number; // aliased from log_id
  action: string;
  details: string;
  timestamp: string; // aliased from executed_at
}

interface CustomerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
}

interface AccountForm {
  customer_id: string;
  account_type: AccountType;
}

interface TxnForm {
  account_id: string;
  amount: string;
}

export default function Home() {
  const API = "http://127.0.0.1:8000";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
  });
  const [accountForm, setAccountForm] = useState<AccountForm>({
    customer_id: "",
    account_type: "SAVINGS",
  });
  const [txnForm, setTxnForm] = useState<TxnForm>({
    account_id: "",
    amount: "",
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [custRes, txnRes, auditRes] = await Promise.all([
        axios.get<Customer[]>(`${API}/customers`),
        axios.get<Transaction[]>(`${API}/transactions`),
        axios.get<AuditLog[]>(`${API}/audit`),
      ]);

      setCustomers(custRes.data || []);
      setTransactions(txnRes.data || []);
      setAuditLogs(auditRes.data || []);

      // Fetch accounts for all customers
      if (custRes.data?.length) {
        const accountsPromises = custRes.data.map((c) =>
          axios.get<Account[]>(`${API}/accounts/${c.customer_id}`)
            .then(res => res.data)
            .catch(() => [] as Account[])
        );
        const allAccounts = (await Promise.all(accountsPromises)).flat();
        setAccounts(allAccounts);
      }
    } catch (err: any) {
      setError("Failed to load data. Check if backend is running.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addCustomer = async () => {
    try {
      await axios.post(`${API}/customers`, null, { params: customerForm });
      await fetchData();
      setCustomerForm({ first_name: "", last_name: "", email: "", phone: "" });
    } catch (err) {
      alert("Failed to add customer");
    }
  };

  const createAccount = async () => {
    const custId = parseInt(accountForm.customer_id);
    if (isNaN(custId)) {
      alert("Please enter a valid Customer ID");
      return;
    }
    try {
      await axios.post(`${API}/accounts`, null, {
        params: { customer_id: custId, account_type: accountForm.account_type },
      });
      alert("Account created!");
      await fetchData();
    } catch (err) {
      alert("Account creation failed");
    }
  };

  const deposit = async () => {
    const accId = parseInt(txnForm.account_id);
    const amount = parseFloat(txnForm.amount);
    if (isNaN(accId) || isNaN(amount) || amount <= 0) {
      alert("Please enter valid Account ID and Amount");
      return;
    }
    try {
      await axios.post(`${API}/deposit`, null, { params: { account_id: accId, amount } });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Deposit failed");
    }
  };

  const withdraw = async () => {
    const accId = parseInt(txnForm.account_id);
    const amount = parseFloat(txnForm.amount);
    if (isNaN(accId) || isNaN(amount) || amount <= 0) {
      alert("Please enter valid Account ID and Amount");
      return;
    }
    try {
      await axios.post(`${API}/withdraw`, null, { params: { account_id: accId, amount } });
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Withdrawal failed");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-blue-700">🏦 Simple Bank Dashboard</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-6 text-center">{error}</div>}

      {/* Customers */}
      <section className="bg-white rounded-xl shadow-md p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">👤 Add New Customer</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          {(["first_name", "last_name", "email", "phone"] as const).map((field) => (
            <input
              key={field}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
              placeholder={field.replace(/_/g, " ")}
              value={customerForm[field]}
              onChange={(e) => setCustomerForm({ ...customerForm, [field]: e.target.value })}
            />
          ))}
          <button
            onClick={addCustomer}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Add Customer
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-2">Customers ({customers.length})</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border text-gray-700 font-semibold">ID</th>
                    <th className="p-2 border text-gray-700 font-semibold">Name</th>
                    <th className="p-2 border text-gray-700 font-semibold">Email</th>
                    <th className="p-2 border text-gray-700 font-semibold">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50">
                      <td className="border p-2 text-center text-gray-600">#{c.customer_id}</td>
                      <td className="border p-2 text-gray-800 font-medium">{c.first_name} {c.last_name}</td>
                      <td className="border p-2 text-gray-700">{c.email}</td>
                      <td className="border p-2 text-gray-600">{c.phone || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Accounts */}
      <section className="bg-white rounded-xl shadow-md p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🏦 Create Account</h2>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 placeholder-gray-400"
            placeholder="Customer ID"
            value={accountForm.customer_id}
            onChange={(e) => setAccountForm({ ...accountForm, customer_id: e.target.value })}
          />
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800"
            value={accountForm.account_type}
            onChange={(e) => setAccountForm({ ...accountForm, account_type: e.target.value as AccountType })}
          >
            <option value="SAVINGS">SAVINGS</option>
            <option value="CURRENT">CURRENT</option>
          </select>
          <button
            onClick={createAccount}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
          >
            Create Account
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-2">Accounts ({accounts.length})</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border text-gray-700 font-semibold">Account ID</th>
                    <th className="p-2 border text-gray-700 font-semibold">Customer ID</th>
                    <th className="p-2 border text-gray-700 font-semibold">Type</th>
                    <th className="p-2 border text-gray-700 font-semibold">Balance (₹)</th>
                    <th className="p-2 border text-gray-700 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.account_id} className="hover:bg-gray-50">
                      <td className="border p-2 text-center text-gray-600">#{a.account_id}</td>
                      <td className="border p-2 text-gray-600">#{a.customer_id}</td>
                      <td className="border p-2 text-gray-800 font-medium">{a.account_type}</td>
                      <td className="border p-2 font-semibold text-gray-900">₹{a.balance.toFixed(2)}</td>
                      <td className="border p-2 text-sm text-gray-500">
                        {new Date(a.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Transactions */}
      <section className="bg-white rounded-xl shadow-md p-5 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">💸 Deposit / Withdraw</h2>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
            placeholder="Account ID"
            value={txnForm.account_id}
            onChange={(e) => setTxnForm({ ...txnForm, account_id: e.target.value })}
          />
          <input
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
            placeholder="Amount"
            type="number"
            step="0.01"
            value={txnForm.amount}
            onChange={(e) => setTxnForm({ ...txnForm, amount: e.target.value })}
          />
          <button
            onClick={deposit}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Deposit
          </button>
          <button
            onClick={withdraw}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-medium"
          >
            Withdraw
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-2">Recent Transactions ({transactions.length})</h3>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border text-gray-700 font-semibold">Txn ID</th>
                    <th className="p-2 border text-gray-700 font-semibold">Account</th>
                    <th className="p-2 border text-gray-700 font-semibold">Type</th>
                    <th className="p-2 border text-gray-700 font-semibold">Amount (₹)</th>
                    <th className="p-2 border text-gray-700 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="border p-2 text-center text-gray-600">#{t.id}</td>
                      <td className="border p-2 text-gray-600">#{t.account_id}</td>
                      <td className="border p-2">
                        <span className={`font-medium ${t.transaction_type === "DEPOSIT" ? "text-green-600" : "text-red-600"}`}>
                          {t.transaction_type}
                        </span>
                      </td>
                      <td className="border p-2 text-gray-900 font-medium">₹{t.amount.toFixed(2)}</td>
                      <td className="border p-2 text-sm text-gray-500">
                        {new Date(t.transaction_time).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Audit Logs */}
      <section className="bg-white rounded-xl shadow-md p-5">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">🔍 Audit Logs</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 border">Log ID</th>
                  <th className="p-2 border">Action</th>
                  <th className="p-2 border">Details</th>
                  <th className="p-2 border">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="border p-2 text-center text-gray-600">#{log.id}</td>
                    <td className="border p-2 font-medium text-gray-800">{log.action}</td>
                    <td className="border p-2 text-sm max-w-xs break-words text-gray-700">{log.details}</td>
                    <td className="border p-2 text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}