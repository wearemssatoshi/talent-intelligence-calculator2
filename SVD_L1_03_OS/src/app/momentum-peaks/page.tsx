import MomentumCalculator from '@/components/MomentumCalculator';

export default function MomentumPeaksPage() {
    return (
        <main className="min-h-screen bg-slate-950 py-12 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 tracking-tight">
                        SVD MOMENTUM PEAKS
                    </h1>
                    <p className="text-slate-400 max-w-2xl mx-auto font-light tracking-wide">
                        ADVANCED REVENUE FORECASTING SYSTEM
                    </p>
                </div>
                <MomentumCalculator />
            </div>
        </main>
    );
}
