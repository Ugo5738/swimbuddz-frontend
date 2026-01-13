"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LoadingCard } from "@/components/ui/LoadingCard";
import {
    deleteBankAccount,
    getMyBankAccount,
    listBanks,
    resolveAccount,
    saveBankAccount,
    type Bank,
    type BankAccount,
} from "@/lib/payouts";
import { Ban, Building2, CheckCircle, CreditCard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function BankAccountPage() {
    const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [loading, setLoading] = useState(true);
    const [banksError, setBanksError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form state
    const [bankCode, setBankCode] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [verifiedName, setVerifiedName] = useState<string | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);

    const FALLBACK_BANKS: Bank[] = [
        { name: "Access Bank", code: "044", slug: "access-bank" },
        { name: "Access Bank (Diamond)", code: "063", slug: "diamond-bank" },
        { name: "Citibank", code: "023", slug: "citibank" },
        { name: "Ecobank", code: "050", slug: "ecobank" },
        { name: "Fidelity Bank", code: "070", slug: "fidelity-bank" },
        { name: "First Bank of Nigeria", code: "011", slug: "first-bank-of-nigeria" },
        { name: "First City Monument Bank", code: "214", slug: "first-city-monument-bank" },
        { name: "Guaranty Trust Bank", code: "058", slug: "guaranty-trust-bank" },
        { name: "Heritage Bank", code: "030", slug: "heritage-bank" },
        { name: "Keystone Bank", code: "082", slug: "keystone-bank" },
        { name: "Polaris Bank", code: "076", slug: "polaris-bank" },
        { name: "Stanbic IBTC Bank", code: "221", slug: "stanbic-ibtc-bank" },
        { name: "Standard Chartered Bank", code: "068", slug: "standard-chartered-bank" },
        { name: "Sterling Bank", code: "232", slug: "sterling-bank" },
        { name: "Union Bank of Nigeria", code: "032", slug: "union-bank-of-nigeria" },
        { name: "United Bank For Africa", code: "033", slug: "united-bank-for-africa" },
        { name: "Unity Bank", code: "215", slug: "unity-bank" },
        { name: "Wema Bank", code: "035", slug: "wema-bank" },
        { name: "Zenith Bank", code: "057", slug: "zenith-bank" },
    ];

    async function fetchBanks(): Promise<Bank[]> {
        try {
            const bankList = await listBanks();
            if (bankList && bankList.length > 0) {
                console.info(`Loaded ${bankList.length} banks from API`);
                setBanksError(null);
                return bankList;
            }
            setBanksError("No banks returned from server. Showing fallback list.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unable to load banks from server.";
            setBanksError(`${message} Showing fallback list.`);
        }
        console.info(`Loaded ${FALLBACK_BANKS.length} banks from fallback list`);
        return FALLBACK_BANKS;
    }

    // Load bank list first, then bank account (404 tolerated)
    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                const bankList = await fetchBanks();
                if (!isMounted) return;
                setBanks(bankList);

                try {
                    const account = await getMyBankAccount();
                    if (!isMounted) return;
                    setBankAccount(account);
                    if (account) {
                        setBankCode(account.bank_code);
                        setAccountNumber(account.account_number);
                        setVerifiedName(account.account_name);
                    }
                } catch (err) {
                    console.info("No existing bank account; continuing", err);
                    setBankAccount(null);
                }
            } catch (err) {
                console.error("Failed to load bank data", err);
                toast.error("Failed to load bank information");
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        load();
        return () => {
            isMounted = false;
        };
    }, []);

    // Verify account when user enters 10+ digits and selects a bank
    const handleVerify = async () => {
        if (!bankCode || accountNumber.length < 10) {
            return;
        }

        setVerifying(true);
        setVerificationError(null);
        setVerifiedName(null);

        try {
            const result = await resolveAccount(bankCode, accountNumber);
            setVerifiedName(result.account_name);
            toast.success(`Account verified: ${result.account_name}`);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Verification failed";
            setVerificationError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setVerifying(false);
        }
    };

    // Save bank account
    const handleSave = async () => {
        if (!bankCode || !accountNumber || !verifiedName) {
            toast.error("Please verify your account first");
            return;
        }

        const selectedBank = banks.find((b) => b.code === bankCode);
        if (!selectedBank) {
            toast.error("Please select a bank");
            return;
        }

        setSaving(true);
        try {
            const saved = await saveBankAccount({
                bank_code: bankCode,
                bank_name: selectedBank.name,
                account_number: accountNumber,
            });
            // Re-fetch to ensure we have the latest from the API
            const refreshed = await getMyBankAccount().catch(() => saved);
            const nextAccount = refreshed || saved;
            setBankAccount(nextAccount);
            setVerifiedName(nextAccount.account_name);
            setBankCode(nextAccount.bank_code);
            setAccountNumber(nextAccount.account_number);
            toast.success("Bank account saved successfully!");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to save";
            toast.error(errorMessage);
        } finally {
            setSaving(false);
        }
    };

    // Delete bank account
    const handleDelete = async () => {
        if (!confirm("Are you sure you want to remove your bank account?")) {
            return;
        }

        setDeleting(true);
        try {
            await deleteBankAccount();
            setBankAccount(null);
            setBankCode("");
            setAccountNumber("");
            setVerifiedName(null);
            toast.success("Bank account removed");
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to delete";
            toast.error(errorMessage);
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return <LoadingCard text="Loading bank account..." />;
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Bank Account</h1>
                <p className="text-slate-600 mt-1">
                    Add your bank account details to receive payouts.
                </p>
            </div>

            {/* Current Account Display */}
            {bankAccount && bankAccount.is_verified && (
                <Card className="p-6 bg-emerald-50 border-emerald-200">
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-full bg-emerald-100">
                            <CheckCircle className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-emerald-900">Verified Account</h3>
                            <div className="mt-2 space-y-1 text-sm text-emerald-800">
                                <p><span className="font-medium">Account Name:</span> {bankAccount.account_name}</p>
                                <p><span className="font-medium">Bank:</span> {bankAccount.bank_name}</p>
                                <p><span className="font-medium">Account Number:</span> {bankAccount.account_number}</p>
                            </div>
                            {bankAccount.paystack_recipient_code && (
                                <p className="mt-2 text-xs text-emerald-600">
                                    ✓ Ready for automated payouts
                                </p>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Add/Edit Form */}
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Building2 className="h-5 w-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-900">
                        {bankAccount ? "Update Bank Account" : "Add Bank Account"}
                    </h2>
                </div>

                <div className="space-y-4">
                    {banksError && (
                        <Alert variant="info" title="Banks list">
                            {banksError}
                        </Alert>
                    )}

                    {/* Bank Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Select Bank
                        </label>
                        <select
                            value={bankCode}
                            onChange={(e) => {
                                setBankCode(e.target.value);
                                setVerifiedName(null);
                                setVerificationError(null);
                            }}
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                            <option value="">Choose your bank...</option>
                            {banks.map((bank) => (
                                <option key={bank.code} value={bank.code}>
                                    {bank.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Account Number */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Account Number (10 digits)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={10}
                                value={accountNumber}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, "");
                                    setAccountNumber(value);
                                    setVerifiedName(null);
                                    setVerificationError(null);
                                }}
                                placeholder="0123456789"
                                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                            <Button
                                onClick={handleVerify}
                                disabled={!bankCode || accountNumber.length < 10 || verifying}
                                variant="secondary"
                            >
                                {verifying ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    "Verify"
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            We'll verify your account name with the bank.
                        </p>
                    </div>

                    {/* Verification Result */}
                    {verifiedName && (
                        <Alert variant="success" title="Account Verified">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Account Name: <strong>{verifiedName}</strong></span>
                            </div>
                        </Alert>
                    )}

                    {verificationError && (
                        <Alert variant="error" title="Verification Failed">
                            {verificationError}
                        </Alert>
                    )}

                    {/* Save Button */}
                    <div className="pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={!verifiedName || saving}
                            className="w-full"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Save Bank Account
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-slate-50">
                <h3 className="font-medium text-slate-900 mb-2">About Payouts</h3>
                <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Payouts are processed after each teaching period</li>
                    <li>• Automated transfers to your bank account</li>
                    <li>• View your payout history in the Payouts tab</li>
                </ul>
            </Card>
        </div>
    );
}
