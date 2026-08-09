import { useEffect, useState } from "react";
import { Hero } from "./components/Hero";
import { Nav } from "./components/Nav";
import { StartHere } from "./components/StartHere";
import { Learn } from "./components/Learn";
import { Products } from "./components/Products";
import { Builder } from "./components/Builder";
import { Backtest } from "./components/Backtest";
import { Projection } from "./components/Projection";
import { Plan } from "./components/Plan";
import { Footer } from "./components/Footer";
import { useHistory } from "./useHistory";
import { loadStore, saveStore, type Profile, type Store } from "./storage";

export default function App() {
  const { data: history, err } = useHistory();
  const [store, setStore] = useState<Store>(loadStore);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const profile = store.profile;
  const updateProfile = (patch: Partial<Profile>) =>
    setStore((s) => ({ ...s, profile: { ...s.profile, ...patch } }));

  // On a fresh load the browser tries to scroll to the URL hash before React
  // has rendered the sections (and async content shifts layout afterwards), so
  // the target is missed. Re-scroll to it once it exists, re-attempting briefly
  // to survive layout shifts, and bail if the user starts scrolling themselves.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let cancelled = false;
    const onUserScroll = () => {
      cancelled = true;
    };
    window.addEventListener("wheel", onUserScroll, { passive: true });
    window.addEventListener("touchmove", onUserScroll, { passive: true });
    window.addEventListener("keydown", onUserScroll);

    const start = performance.now();
    const tick = () => {
      if (cancelled) return cleanup();
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      if (performance.now() - start < 1500) {
        timer = window.setTimeout(tick, 150);
      } else {
        cleanup();
      }
    };

    let timer = window.setTimeout(tick, 0);
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onUserScroll);
      window.removeEventListener("touchmove", onUserScroll);
      window.removeEventListener("keydown", onUserScroll);
    };
    return cleanup;
  }, []);

  return (
    <div id="top" className="min-h-screen bg-[#0a1210] text-stone-100">
      <Hero profile={profile} />
      <Nav />
      <StartHere profile={profile} updateProfile={updateProfile} />
      {err && (
        <div className="mx-auto mt-6 max-w-6xl px-5">
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-200">
            Couldn't load live price history ({err}). Learning and planning still
            work; backtests need the API.
          </p>
        </div>
      )}
      <main>
        <Learn />
        <Products history={history} />
        <Builder history={history} profile={profile} updateProfile={updateProfile} />
        <Backtest history={history} profile={profile} />
        <Projection history={history} profile={profile} />
        <Plan
          history={history}
          store={store}
          setStore={setStore}
          profile={profile}
          updateProfile={updateProfile}
        />
      </main>
      <Footer />
    </div>
  );
}
