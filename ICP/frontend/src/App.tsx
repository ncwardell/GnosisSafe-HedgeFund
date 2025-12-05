import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Header from './components/Header';
import Footer from './components/Footer';
import ProfileSetupModal from './components/ProfileSetupModal';
import DashboardRouter from './pages/DashboardRouter';
import { Loader2 } from 'lucide-react';

export default function App() {
    const { identity, isInitializing } = useInternetIdentity();
    const { data: userProfile, isLoading: profileLoading, isFetched } = useGetCallerUserProfile();

    const isAuthenticated = !!identity;
    const showProfileSetup = isAuthenticated && !profileLoading && isFetched && userProfile === null;

    if (isInitializing) {
        return (
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                <div className="flex h-screen items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Initializing...</p>
                    </div>
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <div className="flex min-h-screen flex-col bg-background">
                <Header />
                <main className="flex-1">
                    {isAuthenticated ? (
                        <>
                            {showProfileSetup && <ProfileSetupModal />}
                            <DashboardRouter />
                        </>
                    ) : (
                        <LandingPage />
                    )}
                </main>
                <Footer />
                <Toaster />
            </div>
        </ThemeProvider>
    );
}

function LandingPage() {
    const { login, isLoggingIn } = useInternetIdentity();

    return (
        <div className="relative overflow-hidden">
            {/* Hero Section */}
            <section className="relative px-6 py-24 lg:px-8 lg:py-32">
                <div className="absolute inset-0 -z-10 overflow-hidden">
                    <div className="absolute left-1/2 top-0 -translate-x-1/2 blur-3xl">
                        <div
                            className="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-primary/30 to-accent/30 opacity-30"
                            style={{
                                clipPath:
                                    'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                            }}
                        />
                    </div>
                </div>

                <div className="mx-auto max-w-7xl">
                    <div className="grid gap-12 lg:grid-cols-2 lg:gap-8">
                        <div className="flex flex-col justify-center">
                            <div className="mb-8 flex items-center gap-3">
                                <img src="/assets/generated/platform-logo-transparent.dim_200x200.png" alt="Platform Logo" className="h-16 w-16" />
                                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                                    ICP Hedge Fund Platform
                                </h1>
                            </div>
                            <p className="mb-8 text-lg text-muted-foreground lg:text-xl">
                                A modular, transparent, and secure hedge fund platform built on the Internet Computer. Create and manage
                                multiple investment funds with comprehensive vault management, sophisticated fee structures, and robust
                                investor protections.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={login}
                                    disabled={isLoggingIn}
                                    className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isLoggingIn ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        'Get Started'
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="relative">
                            <img
                                src="/assets/generated/dashboard-hero.dim_1200x800.png"
                                alt="Dashboard Preview"
                                className="rounded-2xl shadow-2xl ring-1 ring-border"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="border-t bg-muted/30 px-6 py-24 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-16 text-center">
                        <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">Platform Features</h2>
                        <p className="text-lg text-muted-foreground">
                            Enterprise-grade fund management with complete transparency
                        </p>
                    </div>

                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <FeatureCard
                            icon="/assets/generated/vault-icon.dim_128x128.png"
                            title="Vault Management"
                            description="Create and manage multiple independent hedge funds with queue-based processing, batching, and slippage protection."
                        />
                        <FeatureCard
                            icon="/assets/generated/share-token.dim_100x100.png"
                            title="Share Token System"
                            description="ICP-native fungible tokens with automatic minting and burning based on NAV calculations."
                        />
                        <FeatureCard
                            title="Fee Management"
                            description="Comprehensive fee structures including management, performance, entrance, and exit fees with high water mark tracking."
                        />
                        <FeatureCard
                            title="Emergency Controls"
                            description="Guardian-managed pause functionality and emergency withdrawal system with pro-rata distribution."
                        />
                        <FeatureCard
                            title="Role-Based Access"
                            description="Granular permissions with Admin, Processor, AUM Updater, and Guardian roles for secure operations."
                        />
                        <FeatureCard
                            title="Full Transparency"
                            description="Real-time metrics, transaction history, and complete fund configuration visibility for all stakeholders."
                        />
                    </div>
                </div>
            </section>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon?: string; title: string; description: string }) {
    return (
        <div className="group relative overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md">
            {icon && (
                <div className="mb-4">
                    <img src={icon} alt={title} className="h-12 w-12 opacity-80" />
                </div>
            )}
            <h3 className="mb-2 text-xl font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
        </div>
    );
}
