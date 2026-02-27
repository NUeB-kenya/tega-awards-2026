import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import tegaLogo from '@/assets/tega-logo.png';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-dark">
      <div className="text-center animate-fade-in">
        <img src={tegaLogo} alt="TEGA" className="mx-auto mb-6 h-24 w-auto max-w-[240px] object-contain" />
        <h1 className="mb-4 font-display text-6xl font-bold text-gradient-gold">404</h1>
        <p className="mb-6 text-xl text-muted-foreground">Page not found</p>
        <Link to="/auth" className="inline-block rounded-lg bg-gradient-gold px-6 py-3 font-semibold text-primary-foreground hover:opacity-90 transition-opacity">
          Return Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
