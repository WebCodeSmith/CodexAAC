export type BanishmentType = 'account' | 'account_history' | 'ip'

export interface Banishment {
    id?: number
    type: BanishmentType
    accountId?: number
    accountName: string
    reason: string
    bannedAt: number
    expiresAt: number
    bannedBy: number
    bannedByName: string
    isActive: boolean
}

export interface BanishmentsResponse {
    banishments: Banishment[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

