import Link from "next/link";
import SignInForm from "@/components/SignInForm";
import BrandLogo from "@/components/BrandLogo";
import { safeNext } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }) {
  const { next: rawNext, mode: rawMode, type } = await searchParams;
  const mode = rawMode === "signup" ? "signup" : "signin";
  const signup = mode === "signup";
  const next = safeNext(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  const askedForApp = Boolean(rawNext);

  return (
    <div className="page-container">
      <header className="navbar">
        <BrandLogo size="lg" />

        <nav className="nav-right">
          <div className="language">
            <a href="#" className="active">
              EN
            </a>
            <span>|</span>
            <a href="#">বাংলা</a>
          </div>

        </nav>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <div className="hero-text">
            <h1>
              Know your air.
              <br />
              Act with your
              <br />
              <span>neighbours.</span>
            </h1>
            <p className="subtitle">A cleaner Bangladesh starts with you.</p>
          </div>

          <div className="info-cards">
            <div className="info-card">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M19 35C5 30 3 20 7 8C21 9 27 20 19 35Z" fill="#40B63F" />
                <path d="M19 35C17 16 27 6 39 3C39 19 30 30 19 35Z" fill="#35A943" />
                <path d="M19 35L19 18" stroke="white" strokeWidth="1.5" />
              </svg>
              <div>
                <h4>AQI Live</h4>
                <p>Live in Mirpur</p>
              </div>
            </div>

            <div className="info-card">
              <svg viewBox="0 0 40 40" fill="none">
                <rect x="5" y="24" width="6" height="12" stroke="#27AE42" strokeWidth="2.5" />
                <rect x="17" y="15" width="6" height="21" stroke="#27AE42" strokeWidth="2.5" />
                <rect x="29" y="5" width="6" height="31" stroke="#27AE42" strokeWidth="2.5" />
              </svg>
              <div>
                <h4>6 Missions</h4>
                <p>this week</p>
              </div>
            </div>

            <div className="info-card">
              <svg viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 3L34 9V19C34 28 27 34 20 38C13 34 6 28 6 19V9L20 3Z"
                  stroke="#159B36"
                  strokeWidth="2.5"
                />
                <path d="M13 20L18 25L28 14" stroke="#159B36" strokeWidth="2.5" />
              </svg>
              <div>
                <h4>Moderate</h4>
                <p>flood risk</p>
              </div>
            </div>
          </div>
        </section>

        <section className="login-section">
          <div className="login-card" id="login-card">
            <h2>{signup ? "Create your account" : "Welcome back"}</h2>
            <p className="login-description">
              {signup
                ? "Join your neighbours in keeping Bangladesh clean and green."
                : "Sign in to your citizen or organizer account."}
            </p>
            {askedForApp && (
              <p className="login-notice" role="status">
                Please sign in to open the app.
              </p>
            )}

            <SignInForm key={mode} next={next} mode={mode} type={type} />

            <div className="divider">
              <span></span>
              <p>or</p>
              <span></span>
            </div>

            <div className="create-account">
              <Link href={`/sign-in?${new URLSearchParams({ ...(rawNext ? { next } : {}), ...(signup ? {} : { mode: "signup" }) })}`}>
                {signup ? "I already have an account" : "Create an account"}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <div className="top-leaf">
        <svg viewBox="0 0 100 110">
          <path d="M5 105C-2 49 25 10 100 1C94 65 53 97 5 105Z" fill="#B8E9AD" />
        </svg>
      </div>

      <div className="bottom-decoration">
        <svg viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0 35C180 20 265 150 530 145C840 150 1110 180 1440 55V200H0Z" fill="#E7F8E5" />
          <path d="M0 130C220 20 365 90 610 145C900 210 1170 145 1440 80V200H0Z" fill="#D2F0CD" />
          <path d="M0 170C200 75 340 95 560 145C850 215 1200 185 1440 105V200H0Z" fill="#BDE9B7" />
        </svg>
      </div>

      <div className="bottom-leaf">
        <svg viewBox="0 0 100 100" fill="none">
          <path d="M48 87C8 78 4 49 7 12C40 16 60 43 48 87Z" fill="#70C75A" />
          <path d="M48 87C43 43 63 12 96 3C94 44 75 73 48 87Z" fill="#55B94A" />
          <path d="M48 87L46 47" stroke="white" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}
