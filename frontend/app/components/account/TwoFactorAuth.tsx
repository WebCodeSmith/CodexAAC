'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import React from 'react'

interface TwoFactorStatus {
    enabled: boolean
}

interface Enable2FAResponse {
    secret: string
    qrCode: string
    otpauthUrl: string
    message: string
}

const TwoFactorAuth = React.memo(() => {
    const [status, setStatus] = useState<TwoFactorStatus>({ enabled: false })
    const [loading, setLoading] = useState(true)
    const [enabling, setEnabling] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [disabling, setDisabling] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const [showQRCode, setShowQRCode] = useState(false)
    const [qrCodeData, setQrCodeData] = useState<Enable2FAResponse | null>(null)
    const [password, setPassword] = useState('')
    const [verifyToken, setVerifyToken] = useState('')
    const [disablePassword, setDisablePassword] = useState('')
    const [disableToken, setDisableToken] = useState('')

    const fetchStatus = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const response = await api.get<TwoFactorStatus>('/account/2fa/status')
            setStatus(response)
        } catch (err: any) {
            setError(err.message || 'Failed to fetch 2FA status')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    const handleEnable = useCallback(async () => {
        if (!password) {
            setError('Password is required')
            return
        }

        try {
            setEnabling(true)
            setError(null)
            setSuccess(null)
            const response = await api.post<Enable2FAResponse>('/account/2fa/enable', { password })
            setQrCodeData(response)
            setShowQRCode(true)
            setPassword('')
        } catch (err: any) {
            setError(err.message || 'Failed to enable 2FA')
        } finally {
            setEnabling(false)
        }
    }, [password])

    const handleVerify = useCallback(async () => {
        if (!verifyToken || verifyToken.length !== 6) {
            setError('Please enter a valid 6-digit token')
            return
        }

        try {
            setVerifying(true)
            setError(null)
            await api.post('/account/2fa/verify', { token: verifyToken })
            setSuccess('Two-factor authentication has been successfully enabled!')
            setShowQRCode(false)
            setQrCodeData(null)
            setVerifyToken('')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message || 'Invalid token. Please try again.')
        } finally {
            setVerifying(false)
        }
    }, [verifyToken, fetchStatus])

    const handleDisable = useCallback(async () => {
        if (!disablePassword) {
            setError('Password is required')
            return
        }
        if (!disableToken || disableToken.length !== 6) {
            setError('Please enter a valid 6-digit token')
            return
        }

        try {
            setDisabling(true)
            setError(null)
            await api.post('/account/2fa/disable', {
                password: disablePassword,
                token: disableToken,
            })
            setSuccess('Two-factor authentication has been successfully disabled.')
            setDisablePassword('')
            setDisableToken('')
            await fetchStatus()
        } catch (err: any) {
            setError(err.message || 'Failed to disable 2FA')
        } finally {
            setDisabling(false)
        }
    }, [disablePassword, disableToken, fetchStatus])

    useEffect(() => {
        if (error || success) {
            const timer = setTimeout(() => {
                setError(null)
                setSuccess(null)
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [error, success])

    if (loading) {
        return (
            <div className="space-y-6">
                <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Two-Factor Authentication</h2>
                <div className="bg-[#1a1a1a] border border-[#404040]/60 rounded-lg p-6">
                    <p className="text-[#d0d0d0]">Loading...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#ffd700] mb-4">Two-Factor Authentication</h2>

            {/* Error/Success Messages */}
            {error && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}
            {success && (
                <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4">
                    <p className="text-green-400 text-sm">{success}</p>
                </div>
            )}

            {/* 2FA Not Enabled - Enable Section */}
            {!status.enabled && !showQRCode && (
                <div className="bg-[#1a1a1a] border border-[#404040]/60 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-[#ffd700] font-bold mb-3">
                                Connect your Codex account to an authenticator app!
                            </h3>
                            <p className="text-[#d0d0d0] text-sm mb-4">
                                As a first step to connect an <strong>authenticator app</strong> to your account, enter your password and click "Activate"!
                                Then pick up your phone, read the QR code and enter the authentication code shown.
                            </p>
                            <div className="bg-[#0a0a0a] border border-[#404040]/60 rounded-lg p-4 mb-4">
                                <p className="text-[#888] text-sm">
                                    🔒 Two-factor authentication is currently <strong className="text-red-400">not activated</strong> for your account.
                                </p>
                            </div>
                            <div className="max-w-md">
                                <label className="block text-[#d0d0d0] text-sm font-medium mb-2">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    className="w-full bg-[#0a0a0a] border-2 border-[#404040]/60 rounded-lg px-4 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666]"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleEnable}
                            disabled={enabling || !password}
                            className="bg-green-700 hover:bg-green-600 disabled:bg-[#404040] disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all whitespace-nowrap ml-4"
                        >
                            {enabling ? 'Activating...' : 'Activate'}
                        </button>
                    </div>

                    <div className="border-t border-[#404040]/60 pt-4">
                        <h4 className="text-[#ffd700] font-bold mb-2">Benefits of 2FA:</h4>
                        <ul className="space-y-2 text-[#d0d0d0] text-sm">
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>Enhanced account security</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>Protection against unauthorized access</span>
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>Works with Google Authenticator, Authy, and other apps</span>
                            </li>
                        </ul>
                    </div>
                </div>
            )}

            {/* QR Code Display - Verification Step */}
            {showQRCode && qrCodeData && (
                <div className="bg-[#1a1a1a] border border-[#404040]/60 rounded-lg p-6">
                    <h3 className="text-[#ffd700] font-bold mb-4">Scan QR Code</h3>
                    <p className="text-[#d0d0d0] text-sm mb-4">
                        Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>

                    {/* QR Code Image */}
                    <div className="flex justify-center mb-6">
                        <div className="bg-white p-4 rounded-lg">
                            <img
                                src={`data:image/png;base64,${qrCodeData.qrCode}`}
                                alt="2FA QR Code"
                                className="w-64 h-64"
                            />
                        </div>
                    </div>

                    {/* Manual Entry */}
                    <div className="bg-[#0a0a0a] border border-[#404040]/60 rounded-lg p-4 mb-4">
                        <p className="text-[#888] text-xs mb-2">Can't scan? Enter this code manually:</p>
                        <code className="text-[#3b82f6] text-sm break-all">{qrCodeData.secret}</code>
                    </div>

                    {/* Verify Token Input */}
                    <div className="max-w-md">
                        <label className="block text-[#d0d0d0] text-sm font-medium mb-2">
                            Enter 6-digit code from your app
                        </label>
                        <input
                            type="text"
                            value={verifyToken}
                            onChange={(e) => setVerifyToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="w-full bg-[#0a0a0a] border-2 border-[#404040]/60 rounded-lg px-4 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666] text-center text-2xl tracking-widest"
                        />
                    </div>

                    <div className="flex gap-4 mt-6">
                        <button
                            onClick={handleVerify}
                            disabled={verifying || verifyToken.length !== 6}
                            className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:bg-[#404040] disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all"
                        >
                            {verifying ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        <button
                            onClick={() => {
                                setShowQRCode(false)
                                setQrCodeData(null)
                                setVerifyToken('')
                                setError(null)
                            }}
                            disabled={verifying}
                            className="bg-[#404040] hover:bg-[#505050] disabled:bg-[#303030] disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* 2FA Enabled - Disable Section */}
            {status.enabled && (
                <div className="bg-[#1a1a1a] border border-[#404040]/60 rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                            <h3 className="text-[#ffd700] font-bold mb-3">Two-Factor Authentication</h3>
                            <div className="bg-green-900/20 border border-green-500/50 rounded-lg p-4 mb-4">
                                <p className="text-green-400 text-sm">
                                    🔒 Two-factor authentication is currently <strong>activated</strong> for your account.
                                </p>
                            </div>
                            <p className="text-[#d0d0d0] text-sm mb-4">
                                To disable two-factor authentication, enter your password and a 6-digit code from your authenticator app.
                            </p>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="block text-[#d0d0d0] text-sm font-medium mb-2">
                                        Password
                                    </label>
                                    <input
                                        type="password"
                                        value={disablePassword}
                                        onChange={(e) => setDisablePassword(e.target.value)}
                                        placeholder="Enter your password"
                                        className="w-full bg-[#0a0a0a] border-2 border-[#404040]/60 rounded-lg px-4 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[#d0d0d0] text-sm font-medium mb-2">
                                        2FA Token
                                    </label>
                                    <input
                                        type="text"
                                        value={disableToken}
                                        onChange={(e) => setDisableToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="000000"
                                        maxLength={6}
                                        className="w-full bg-[#0a0a0a] border-2 border-[#404040]/60 rounded-lg px-4 py-2 text-[#e0e0e0] focus:outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#3b82f6]/20 transition-all placeholder:text-[#666] text-center text-xl tracking-widest"
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={handleDisable}
                            disabled={disabling || !disablePassword || disableToken.length !== 6}
                            className="bg-red-700 hover:bg-red-600 disabled:bg-[#404040] disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-all whitespace-nowrap ml-4"
                        >
                            {disabling ? 'Disabling...' : 'Disable 2FA'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
})

TwoFactorAuth.displayName = 'TwoFactorAuth'

export default TwoFactorAuth

