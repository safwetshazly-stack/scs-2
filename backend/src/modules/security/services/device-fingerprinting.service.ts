import crypto from 'crypto'
import { Request } from 'express'

export interface DeviceFingerprintData {
  userAgent: string
  ipAddress: string
  os: string
  browser: string
  salt: string
}

export class DeviceFingerprintingService {
  private readonly algorithm = 'sha256'

  /**
   * Generate a unique device fingerprint from request data
   * Combines user-agent, IP, OS, browser, and random salt
   */
  generateFingerprint(req: Request): { fingerprint: string; data: DeviceFingerprintData } {
    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress = this.extractIpAddress(req)
    const { os, browser } = this.parseUserAgent(userAgent)
    const salt = crypto.randomBytes(16).toString('hex')

    const fingerprintData: DeviceFingerprintData = {
      userAgent,
      ipAddress,
      os,
      browser,
      salt,
    }

    const fingerprint = this.hashFingerprint(fingerprintData)

    return { fingerprint, data: fingerprintData }
  }

  /**
   * Hash fingerprint data using SHA256
   */
  private hashFingerprint(data: DeviceFingerprintData): string {
    const combined = `${data.userAgent}|${data.ipAddress}|${data.os}|${data.browser}|${data.salt}`
    return crypto.createHash(this.algorithm).update(combined).digest('hex')
  }

  /**
   * Validate if a fingerprint matches the request
   * Does not check salt (salt is per-registration)
   */
  validateFingerprint(req: Request, storedFingerprint: string, storedData?: DeviceFingerprintData): {
    isValid: boolean
    riskLevel: 'low' | 'medium' | 'high'
    reason?: string
  } {
    const userAgent = req.get('user-agent') || 'unknown'
    const ipAddress = this.extractIpAddress(req)
    const { os, browser } = this.parseUserAgent(userAgent)

    // If we have stored data, perform detailed comparison
    if (storedData) {
      const userAgentMatch = userAgent === storedData.userAgent
      const osMatch = os === storedData.os
      const browserMatch = browser === storedData.browser
      const ipMatch = ipAddress === storedData.ipAddress

      if (ipMatch && userAgentMatch && osMatch && browserMatch) {
        return { isValid: true, riskLevel: 'low' }
      }

      // Calculate risk based on mismatches
      let mismatches = 0
      const mismatchReasons: string[] = []

      if (!ipMatch) {
        mismatches++
        mismatchReasons.push('IP')
      }
      if (!userAgentMatch) {
        mismatches++
        mismatchReasons.push('UserAgent')
      }
      if (!osMatch) {
        mismatches++
        mismatchReasons.push('OS')
      }
      if (!browserMatch) {
        mismatches++
        mismatchReasons.push('Browser')
      }

      const riskLevel = mismatches >= 3 ? 'high' : mismatches >= 2 ? 'medium' : 'low'
      const reason = `Mismatches: ${mismatchReasons.join(', ')}`

      return {
        isValid: mismatches <= 1,
        riskLevel,
        reason,
      }
    }

    return { isValid: false, riskLevel: 'high', reason: 'No stored fingerprint data' }
  }

  /**
   * Extract IP address from request
   * Handles proxies and forwarding headers
   */
  private extractIpAddress(req: Request): string {
    const forwarded = req.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    const clientIp = req.get('x-client-ip')
    if (clientIp) {
      return clientIp
    }

    return req.ip || req.socket.remoteAddress || 'unknown'
  }

  /**
   * Parse user agent to extract OS and browser
   */
  private parseUserAgent(userAgent: string): { os: string; browser: string } {
    // Simple parsing - in production, use a library like ua-parser-js
    let os = 'unknown'
    let browser = 'unknown'

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows'
    else if (userAgent.includes('Mac')) os = 'macOS'
    else if (userAgent.includes('Linux')) os = 'Linux'
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS'
    else if (userAgent.includes('Android')) os = 'Android'

    // Detect Browser
    if (userAgent.includes('Chrome')) browser = 'Chrome'
    else if (userAgent.includes('Firefox')) browser = 'Firefox'
    else if (userAgent.includes('Safari')) browser = 'Safari'
    else if (userAgent.includes('Edge')) browser = 'Edge'
    else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'IE'

    return { os, browser }
  }

  /**
   * Check if two IPs are in drastically different geographical regions
   * Simple implementation: just check if they're different
   * In production, use a GeoIP library
   */
  detectImpossibleTravel(previousIp: string, currentIp: string): boolean {
    return previousIp !== currentIp
  }
}

export default new DeviceFingerprintingService()
