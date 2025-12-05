import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Loader2, LogOut, User } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useGetCallerUserProfile } from '../hooks/useQueries';

export default function Header() {
    const { identity, clear, isLoggingIn, login } = useInternetIdentity();
    const { data: userProfile } = useGetCallerUserProfile();
    const queryClient = useQueryClient();
    const { theme, setTheme } = useTheme();

    const isAuthenticated = !!identity;

    const handleLogout = async () => {
        await clear();
        queryClient.clear();
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <img src="/assets/generated/platform-logo-transparent.dim_200x200.png" alt="Logo" className="h-10 w-10" />
                    <div>
                        <h1 className="text-lg font-bold">ICP Hedge Fund Platform</h1>
                        {isAuthenticated && userProfile && (
                            <p className="text-xs text-muted-foreground">Welcome, {userProfile.name}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        className="h-9 w-9"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>

                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <User className="h-4 w-4" />
                                    {userProfile?.name || 'Account'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                    {identity.getPrincipal().toString().slice(0, 20)}...
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Logout
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button onClick={login} disabled={isLoggingIn} size="sm">
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                'Login'
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}
