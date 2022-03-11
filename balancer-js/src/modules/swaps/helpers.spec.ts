import { expect } from 'chai';

import { getLimitsForSlippage, SwapType } from '@/.';

describe('swaps service helpers', () => {
    context('getLimits', () => {
        context('SwapExactIn', () => {
            it('Applies 0 slippage to limits', () => {
                const limits = getLimitsForSlippage(
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                    ],
                    [
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x0fbddc06a4720408a2f5eb78e62bc31ac6e2a3c4',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    SwapType.SwapExactIn,
                    [
                        '300000000000000000',
                        '0',
                        '-86145686129706527',
                        '0',
                        '-99314',
                    ],
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0xcd32a460b6fecd053582e43b07ed6e2c04e15369',
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x6a8c3239695613c0710dc971310b36f9b81e115e',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    '0'
                );
                expect(limits[0].toString()).to.eq('300000000000000000');
                expect(limits[1].toString()).to.eq('0');
                expect(limits[2].toString()).to.eq('-86145686129706527');
                expect(limits[3].toString()).to.eq('0');
                expect(limits[4].toString()).to.eq('-99314');
            });

            it('Applies slippage to limits for tokenOut', () => {
                const limits = getLimitsForSlippage(
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                    ],
                    [
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x0fbddc06a4720408a2f5eb78e62bc31ac6e2a3c4',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    SwapType.SwapExactIn,
                    [
                        '300000000000000000',
                        '0',
                        '-86145686129706527',
                        '0',
                        '-99314',
                    ],
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0xcd32a460b6fecd053582e43b07ed6e2c04e15369',
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x6a8c3239695613c0710dc971310b36f9b81e115e',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    '50000000000000000' // 5%
                );
                expect(limits[0].toString()).to.eq('300000000000000000');
                expect(limits[1].toString()).to.eq('0');
                expect(limits[2].toString()).to.eq('-81838401823221200');
                expect(limits[3].toString()).to.eq('0');
                expect(limits[4].toString()).to.eq('-94348');
            });
        });

        context('SwapExactOut', () => {
            it('Applies 0 slippage to limits', () => {
                const limits = getLimitsForSlippage(
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                    ],
                    [
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x0fbddc06a4720408a2f5eb78e62bc31ac6e2a3c4',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    SwapType.SwapExactOut,
                    [
                        '300000000000000000',
                        '0',
                        '-86145686129706527',
                        '0',
                        '-99314',
                    ],
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0xcd32a460b6fecd053582e43b07ed6e2c04e15369',
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x6a8c3239695613c0710dc971310b36f9b81e115e',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    '0'
                );
                expect(limits[0].toString()).to.eq('300000000000000000');
                expect(limits[1].toString()).to.eq('0');
                expect(limits[2].toString()).to.eq('-86145686129706527');
                expect(limits[3].toString()).to.eq('0');
                expect(limits[4].toString()).to.eq('-99314');
            });

            it('Applies slippage to limits for tokenIn', () => {
                const limits = getLimitsForSlippage(
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                    ],
                    [
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x0fbddc06a4720408a2f5eb78e62bc31ac6e2a3c4',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    SwapType.SwapExactOut,
                    [
                        '300000000000000000',
                        '0',
                        '-86145686129706527',
                        '0',
                        '-99314',
                    ],
                    [
                        '0x21ff756ca0cfcc5fff488ad67babadffee0c4149',
                        '0xcd32a460b6fecd053582e43b07ed6e2c04e15369',
                        '0x4811a7bb9061a46753486e5e84b3cd3d668fb596',
                        '0x6a8c3239695613c0710dc971310b36f9b81e115e',
                        '0xe8191aacfcdb32260cda25830dc6c9342142f310',
                    ],
                    '50000000000000000' // 5%
                );
                expect(limits[0].toString()).to.eq('315000000000000000');
                expect(limits[1].toString()).to.eq('0');
                expect(limits[2].toString()).to.eq('-86145686129706527');
                expect(limits[3].toString()).to.eq('0');
                expect(limits[4].toString()).to.eq('-99314');
            });
        });
    });
});
