import { Relayer } from '@/modules/relayer/relayer.module';

export class RelayerModel {
  chainedRefs: Record<string, string> = {};

  /**
   * Stores `value` as the amount referenced by chained reference `ref`.
   * @param ref
   * @param value
   */
  setChainedReferenceValue(ref: string, value: string): void {
    this.chainedRefs[ref] = value;
  }

  /**
   * Returns the amount referenced by chained reference `ref`.
   * @param ref
   * @returns
   */
  getChainedReferenceValue(ref: string): string {
    return this.chainedRefs[ref];
  }

  doChainedRefReplacement(amount: string): string {
    if (Relayer.isChainedReference(amount.toString())) {
      return this.getChainedReferenceValue(amount.toString());
    } else return amount;
  }

  doChainedRefReplacements(amounts: string[]): string[] {
    return amounts.map((amount) =>
      this.doChainedRefReplacement(amount).toString()
    );
  }
}
