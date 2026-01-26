import { eq, asc } from "drizzle-orm";
import { db } from "../db";
import { tokenPackages, organizationTokenWallets } from "../../shared/schema";
import { tokenWalletService } from "./tokenWalletService";

export class TokenPackageService {
  /**
   * Returns all active token packages ordered by displayOrder
   */
  async getActivePackages() {
    const packages = await db
      .select()
      .from(tokenPackages)
      .where(eq(tokenPackages.isActive, true))
      .orderBy(asc(tokenPackages.displayOrder));

    return packages;
  }

  /**
   * Returns specific package details
   */
  async getPackageById(packageId: number) {
    const pkg = await db.query.tokenPackages.findFirst({
      where: eq(tokenPackages.id, packageId),
    });

    if (!pkg) {
      throw new Error(`Package ${packageId} not found`);
    }

    if (!pkg.isActive) {
      throw new Error(`Package ${packageId} is not active`);
    }

    return pkg;
  }

  /**
   * Calculates price for a specific package
   */
  async calculatePrice(organizationId: number, packageId: number) {
    const pkg = await this.getPackageById(packageId);
    const wallet = await tokenWalletService.getWallet(organizationId);

    const tokenQuantity = parseFloat(pkg.tokenQuantity);
    const pricePerToken = parseFloat(wallet.pricePerToken);
    const totalAmount = tokenQuantity * pricePerToken;

    return {
      tokenQuantity,
      pricePerToken,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      currency: wallet.currency,
    };
  }

  /**
   * Calculates price for custom token amount
   */
  async calculateCustomPrice(organizationId: number, tokenQuantity: number) {
    const wallet = await tokenWalletService.getWallet(organizationId);

    // Validate minimum threshold
    const validation = this.validatePurchaseAmount(organizationId, tokenQuantity);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const pricePerToken = parseFloat(wallet.pricePerToken);
    const totalAmount = tokenQuantity * pricePerToken;

    return {
      tokenQuantity,
      pricePerToken,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      currency: wallet.currency,
    };
  }

  /**
   * Validates purchase amount meets minimum threshold
   */
  validatePurchaseAmount(
    organizationId: number,
    tokenQuantity: number
  ): { isValid: boolean; error?: string } {
    const MIN_PURCHASE = 1; // Minimum 1 token
    const MAX_PURCHASE = 1000000; // Maximum 1 million tokens

    if (tokenQuantity < MIN_PURCHASE) {
      return {
        isValid: false,
        error: `Minimum purchase is ${MIN_PURCHASE} token(s)`,
      };
    }

    if (tokenQuantity > MAX_PURCHASE) {
      return {
        isValid: false,
        error: `Maximum purchase is ${MAX_PURCHASE} tokens`,
      };
    }

    if (tokenQuantity <= 0 || !Number.isFinite(tokenQuantity)) {
      return {
        isValid: false,
        error: "Invalid token quantity",
      };
    }

    return { isValid: true };
  }

  /**
   * Creates a new token package (admin function)
   */
  async createPackage(data: {
    name: string;
    tokenQuantity: string;
    description?: string;
    displayOrder?: number;
    isCustom?: boolean;
  }) {
    const [pkg] = await db
      .insert(tokenPackages)
      .values({
        name: data.name,
        tokenQuantity: data.tokenQuantity,
        description: data.description,
        displayOrder: data.displayOrder || 0,
        isCustom: data.isCustom || false,
        isActive: true,
      })
      .returning();

    return pkg;
  }

  /**
   * Updates an existing package (admin function)
   */
  async updatePackage(
    packageId: number,
    updates: Partial<{
      name: string;
      tokenQuantity: string;
      description: string;
      displayOrder: number;
      isActive: boolean;
    }>
  ) {
    const [updatedPackage] = await db
      .update(tokenPackages)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tokenPackages.id, packageId))
      .returning();

    return updatedPackage;
  }

  /**
   * Deactivates a package (admin function)
   */
  async deactivatePackage(packageId: number) {
    return this.updatePackage(packageId, { isActive: false });
  }
}

export const tokenPackageService = new TokenPackageService();
