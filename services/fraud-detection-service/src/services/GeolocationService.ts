import axios, { AxiosInstance } from 'axios';
import { config } from '../config/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger();

export interface LocationData {
  country?: string;
  state?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  isVpn?: boolean;
  isProxy?: boolean;
  isBot?: boolean;
}

export interface DeviceAnalysis {
  deviceId: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  os: string;
  browser: string;
  userAgent: string;
  isTrusted: boolean;
  firstSeen?: Date;
  lastSeen?: Date;
  riskScore: number;
  anomalies: string[];
}

export interface GeolocationResult {
  ipAddress: string;
  location: LocationData;
  device?: DeviceAnalysis;
  isAnomalous: boolean;
  riskFactors: string[];
  riskScore: number; // 0-100
}

export class GeolocationService {
  private ipGeolocationClient?: AxiosInstance;
  private trustedDevices: Map<string, DeviceAnalysis>;
  private locationCache: Map<string, { data: LocationData; timestamp: number }>;

  constructor() {
    this.trustedDevices = new Map();
    this.locationCache = new Map();
    this.initializeClients();
  }

  /**
   * Initialize geolocation API clients
   */
  private initializeClients(): void {
    const geolocation = config.geolocation;

    if (geolocation?.enabled) {
      this.ipGeolocationClient = axios.create({
        baseURL: geolocation.apiUrl,
        timeout: geolocation.timeout,
        headers: {
          'Authorization': `Bearer ${geolocation.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      logger.info(`IP Geolocation client initialized`, {
        apiUrl: geolocation.apiUrl,
      });
    }
  }

  /**
   * Analyze location from IP address
   */
  async analyzeLocation(ipAddress: string): Promise<GeolocationResult> {
    const result: GeolocationResult = {
      ipAddress,
      location: {},
      isAnomalous: false,
      riskFactors: [],
      riskScore: 0,
    };

    try {
      // Check cache first
      const cached = this.locationCache.get(ipAddress);
      if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
        result.location = cached.data;
        logger.debug(`Location data retrieved from cache`, { ipAddress });
        return result;
      }

      if (!this.ipGeolocationClient) {
        logger.warn(`IP Geolocation client not initialized`);
        return result;
      }

      const response = await this.ipGeolocationClient.post('/locate', {
        ip: ipAddress,
      });

      result.location = {
        country: response.data.country,
        state: response.data.state,
        city: response.data.city,
        latitude: response.data.latitude,
        longitude: response.data.longitude,
        timezone: response.data.timezone,
        isp: response.data.isp,
        isVpn: response.data.isVpn,
        isProxy: response.data.isProxy,
        isBot: response.data.isBot,
      };

      // Cache the result
      this.locationCache.set(ipAddress, {
        data: result.location,
        timestamp: Date.now(),
      });

      // Detect anomalies
      result.isAnomalous = this.detectLocationAnomalies(result);
      result.riskScore = this.calculateLocationRiskScore(result);

      logger.debug(`Location analysis completed`, {
        ipAddress,
        location: `${result.location.city}, ${result.location.state}`,
        riskScore: result.riskScore,
      });
    } catch (error) {
      logger.error(`Location analysis failed`, {
        ipAddress,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Analyze device characteristics
   */
  analyzeDevice(
    deviceId: string,
    userAgent: string,
    memberId?: string
  ): DeviceAnalysis {
    const device: DeviceAnalysis = {
      deviceId,
      deviceType: this.parseDeviceType(userAgent),
      os: this.parseOS(userAgent),
      browser: this.parseBrowser(userAgent),
      userAgent,
      isTrusted: false,
      riskScore: 0,
      anomalies: [],
    };

    // Check if device is trusted (registered and previously used)
    const trusted = this.trustedDevices.get(deviceId);
    if (trusted && memberId) {
      device.isTrusted = true;
      device.firstSeen = trusted.firstSeen;
      device.lastSeen = trusted.lastSeen;
    } else if (memberId) {
      // First time seeing this device
      device.firstSeen = new Date();
      device.anomalies.push('New device');
      device.riskScore += 15;

      // Register device
      this.registerDevice(deviceId, device, memberId);
    }

    // Detect suspicious user agents
    if (this.isSuspiciousUserAgent(userAgent)) {
      device.anomalies.push('Suspicious user agent');
      device.riskScore += 20;
    }

    device.riskScore = Math.min(100, device.riskScore);
    return device;
  }

  /**
   * Correlate location and device data
   */
  async correlateLocationAndDevice(
    ipAddress: string,
    deviceAnalysis: DeviceAnalysis,
    lastKnownLocations: LocationData[]
  ): Promise<{ isAnomalous: boolean; riskScore: number; factors: string[] }> {
    const factors: string[] = [];
    let transitionRiskScore = 0;

    try {
      const currentLocation = await this.analyzeLocation(ipAddress);

      // Check for impossible travel
      if (lastKnownLocations.length > 0) {
        const lastLocation = lastKnownLocations[0];
        const impossibleTravel = this.detectImpossibleTravel(
          lastLocation,
          currentLocation.location
        );

        if (impossibleTravel) {
          factors.push(`Impossible travel: ${impossibleTravel}`);
          transitionRiskScore += 40;
        }
      }

      // Check for unusual location
      if (currentLocation.isAnomalous) {
        factors.push('Unusual location');
        transitionRiskScore += 20;
      }

      // Check for VPN/Proxy usage
      if (currentLocation.location.isVpn) {
        factors.push('VPN detected');
        transitionRiskScore += 25;
      }

      if (currentLocation.location.isProxy) {
        factors.push('Proxy detected');
        transitionRiskScore += 25;
      }

      // Check for bot activity
      if (currentLocation.location.isBot) {
        factors.push('Bot detected');
        transitionRiskScore += 35;
      }

      const isAnomalous = transitionRiskScore > 20;

      logger.debug(`Location-device correlation completed`, {
        deviceId: deviceAnalysis.deviceId,
        isAnomalous,
        riskScore: transitionRiskScore,
        factors,
      });

      return {
        isAnomalous,
        riskScore: Math.min(100, transitionRiskScore),
        factors,
      };
    } catch (error) {
      logger.error(`Location-device correlation failed`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        isAnomalous: false,
        riskScore: 0,
        factors: [],
      };
    }
  }

  /**
   * Detect location anomalies
   */
  private detectLocationAnomalies(result: GeolocationResult): boolean {
    const risks: string[] = [];

    // Check for high-risk countries
    const highRiskCountries = config.geolocation.highRiskCountries || [];
    if (result.location.country && highRiskCountries.includes(result.location.country)) {
      risks.push('High-risk country');
    }

    // Check for known VPN/datacenter IPs
    if (result.location.isVpn || result.location.isProxy) {
      risks.push('VPN or proxy detected');
    }

    // Check for bot activity
    if (result.location.isBot) {
      risks.push('Bot activity detected');
    }

    result.riskFactors = risks;
    return risks.length > 0;
  }

  /**
   * Calculate risk score for location
   */
  private calculateLocationRiskScore(result: GeolocationResult): number {
    let score = 0;

    // High-risk country
    const highRiskCountries = config.geolocation.highRiskCountries || [];
    if (result.location.country && highRiskCountries.includes(result.location.country)) {
      score += 30;
    }

    // VPN/Proxy
    if (result.location.isVpn) {
      score += 25;
    }
    if (result.location.isProxy) {
      score += 20;
    }

    // Bot
    if (result.location.isBot) {
      score += 35;
    }

    return Math.min(100, score);
  }

  /**
   * Detect impossible travel between two locations
   */
  private detectImpossibleTravel(
    previousLocation: LocationData,
    currentLocation: LocationData
  ): string | null {
    if (!previousLocation.latitude || !previousLocation.longitude ||
      !currentLocation.latitude || !currentLocation.longitude) {
      return null;
    }

    const distance = this.calculateDistance(
      previousLocation.latitude,
      previousLocation.longitude,
      currentLocation.latitude,
      currentLocation.longitude
    );

    // If distance is > 1000km, flag as suspicious
    if (distance > 1000) {
      return `${Math.round(distance)} km in impossible time`;
    }

    return null;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Parse device type from user agent
   */
  private parseDeviceType(userAgent: string): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
    const ua = userAgent.toLowerCase();
    if (/(tablet|ipad)|(android(?!.*mobile))/i.test(ua)) {
      return 'tablet';
    }
    if (/mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua)) {
      return 'mobile';
    }
    if (/desktop|windows|mac|linux/i.test(ua)) {
      return 'desktop';
    }
    return 'unknown';
  }

  /**
   * Parse OS from user agent
   */
  private parseOS(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('windows')) return 'Windows';
    if (ua.includes('mac os') || ua.includes('macos')) return 'macOS';
    if (ua.includes('linux')) return 'Linux';
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
    return 'Unknown';
  }

  /**
   * Parse browser from user agent
   */
  private parseBrowser(userAgent: string): string {
    const ua = userAgent.toLowerCase();
    if (ua.includes('edg/')) return 'Edge';
    if (ua.includes('chrome/') && !ua.includes('chromium')) return 'Chrome';
    if (ua.includes('safari/') && !ua.includes('chrome')) return 'Safari';
    if (ua.includes('firefox/')) return 'Firefox';
    if (ua.includes('opera/') || ua.includes('opr/')) return 'Opera';
    return 'Unknown';
  }

  /**
   * Check if user agent is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    // Check for empty or very short user agents
    if (userAgent.length < 20) return true;

    // Check for known automation tools
    if (ua.includes('phantomjs') || ua.includes('selenium') || ua.includes('puppeteer')) {
      return true;
    }

    // Check for suspicious patterns
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider')) {
      return true;
    }

    return false;
  }

  /**
   * Register a trusted device
   */
  private registerDevice(
    deviceId: string,
    device: DeviceAnalysis,
    memberId: string
  ): void {
    const existing = this.trustedDevices.get(deviceId);

    if (!existing) {
      device.firstSeen = new Date();
    }

    device.lastSeen = new Date();
    this.trustedDevices.set(deviceId, device);

    logger.debug(`Device registered`, {
      deviceId,
      memberId,
      deviceType: device.deviceType,
    });
  }

  /**
   * Record device access for tracking
   */
  recordDeviceAccess(deviceId: string): void {
    const existing = this.trustedDevices.get(deviceId);
    if (existing) {
      existing.lastSeen = new Date();
      this.trustedDevices.set(deviceId, existing);
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [ip, cached] of this.locationCache.entries()) {
      if (now - cached.timestamp > maxAge) {
        this.locationCache.delete(ip);
      }
    }
  }
}
