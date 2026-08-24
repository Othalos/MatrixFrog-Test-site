"use client";
import { useState } from "react";

interface Partner {
  id: string;
  name: string;
  description: string;
  links: { label: string; url: string }[];
}

const PARTNERS_DATA: Partner[] = [
  {
    id: "luxurious",
    name: "Luxurious",
    description:
      "$LUXURIOUS – Marketing Token for the $PEPU Pepe Unchained Layer-2 Ecosystem. $LUXURIOUS is a community-driven marketing and visibility token built specifically for the $PEPU Pepe Unchained Layer-2 ecosystem. The purpose of $LUXURIOUS is to increase awareness, reach, and long-term growth for projects building on Pepe Unchained L2 — not through short-term hype, but via organic marketing, community development, and sustainable partnerships.",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0xa30f9765f0d6d4037d1d5440f86ddd14a1d8e1a4" },
      { label: "LinkTree", url: "https://linktr.ee/bigcryptobull" },
      { label: "X", url: "https://x.com/DJDean4You" },
    ],
  },
  {
    id: "cutest-hammer",
    name: "Cutest Hammer",
    description:
      "Everyone is afraid of the Cutest Hammer. Cutest doesn't hesitate to use it or lend it to other admins. The fury of the Cutest Hammer will strike L2 forever. Whether you like it or not. Pure meme token",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0x1609b9ff0041551a5e2de8f23e189e333295bbd3" },
      { label: "X", url: "https://x.com/cutesthammer" },
    ],
  },
  {
    id: "brodo",
    name: "Brodo Beats",
    description:
      "Just for fun — and a little bit out of passion — I've started composing music for the Pepu community! Whether it's a beat that slaps or a melody that vibes with our neon frog energy, I'm diving into sound to give Pepu a voice you can dance to. This is more than a meme — it's a movement, and now… it has a soundtrack.",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0xe3f9b992bf2b58f779bb01c7b1a42454c2919ca6" },
      { label: "Website", url: "https://brodobeats.com/" },
      { label: "X", url: "https://x.com/DEalbum_" },
    ],
  },
  {
    id: "factory",
    name: "Pepu Factory",
    description:
      "The first custom token creation platform on Pepe Unchained L2. What is PepuFactory? A no-code platform to create your own token with advanced tokenomics, bonding curve mechanics, and automatic DEX graduation. To create a token you need to hold 1M+ of our first token FACTORY.",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0xdef0de375d453cf2f8cb26be7f7e758d6ec3e006" },
      { label: "Website", url: "https://pepufactory.xyz/" },
      { label: "X", url: "https://x.com/PepuFactory" },
    ],
  },
  {
    id: "pepora",
    name: "PepOra",
    description:
      "An oracle-guided crypto protocol, shaping how signals and value live on-chain.",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0x5bd6148735debe7282c426d4f3e24a9a19182146" },
      { label: "Website", url: "https://www.pepora.xyz/" },
      { label: "X", url: "https://x.com/PepOraOfficial" },
    ],
  },
  {
    id: "psickb",
    name: "pSICKB",
    description:
      "pSICKB is SickB's token on Pepu Chain. Fixed 555,555,555 supply, self-deployed ERC-20. Own market, own price, own identity. Not a PumpPad token. Behind pSICKB sits the SickB ecosystem, a custom Layer 3 blockchain built on Arbitrum Orbit. Solo-built from source code by CEO Josh Spoehr over a year, self-funded.",
    links: [
      { label: "GeckoTerminal", url: "https://www.geckoterminal.com/pepe-unchained/pools/0xae2c2f4e809b0e9787b047f4df3cafbbcde4c6b7" },
      { label: "Website", url: "https://sickb.io/" },
    ],
  },
];

export default function PartnersDisplay() {
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const togglePartner = (partnerId: string) => {
    setExpandedPartner(expandedPartner === partnerId ? null : partnerId);
  };

  return (
    <div className="w-full z-20 pb-16" style={{ paddingTop: "100px" }}>
      <div style={{ maxWidth: "1100px", marginLeft: "auto", marginRight: "auto", width: "100%" }}>
        <div style={{ paddingLeft: "1rem", paddingRight: "1rem" }}>

          {/* TITLE */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-matrix-green mb-12 terminal glow-text-green text-center fade-in">
            Partners
          </h1>

          {/* DESCRIPTION BOX */}
          <div
            className="border border-matrix-green rounded-md mb-16 fade-in"
            style={{
              padding: "2rem",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 32px 0 rgba(0, 255, 65, 0.1)"
            }}
          >
            <p className="text-matrix-green text-lg leading-relaxed mb-4">
              MatrixFrog is proud to collaborate with innovative projects that share our vision for the future of decentralized technology. Together, we're building a stronger, more interconnected crypto ecosystem.
            </p>
            <p className="text-matrix-green text-base leading-relaxed opacity-80">
              Interested in partnering with MatrixFrog? Reach out to our team to explore collaboration opportunities.
            </p>
          </div>

          {/* PARTNER BOXES */}
          <div className="fade-slide-up" style={{ animationDelay: "0.2s" }}>
            {PARTNERS_DATA.map((partner, index) => (
              <div
                key={partner.id}
                className="border border-matrix-green rounded-md overflow-hidden transition-all duration-300 hover:border-opacity-100"
                style={{
                  marginBottom: index < PARTNERS_DATA.length - 1 ? "1rem" : "0",
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  backdropFilter: "blur(10px)",
                  boxShadow: "0 8px 32px 0 rgba(0, 255, 65, 0.1)"
                }}
              >
                {/* HEADER */}
                <div
                  className="cursor-pointer hover:bg-matrix-green hover:bg-opacity-10 transition-all"
                  style={{ padding: "0.75rem 1.5rem" }}
                  onClick={() => togglePartner(partner.id)}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl md:text-3xl font-bold text-matrix-green terminal glow-text-green">
                      {partner.name}
                    </h2>
                    <span className="text-matrix-green text-2xl md:text-3xl terminal">
                      {expandedPartner === partner.id ? "[-]" : "[+]"}
                    </span>
                  </div>
                </div>

                {/* EXPANDED CONTENT */}
                {expandedPartner === partner.id && (
                  <div className="border-t border-matrix-green border-opacity-30" style={{ padding: "1.5rem" }}>

                    {/* BANNER - Luxurious only */}
                    {partner.id === "luxurious" && (
                      <div style={{ marginBottom: "1.5rem" }}>
                        <a href="https://www.luxuriousnetwork.net" target="_blank" rel="noopener noreferrer">
                          <img
                            src="/LuxBanner.png"
                            alt="Luxurious Banner"
                            style={{ width: "100%", borderRadius: "4px", display: "block" }}
                          />
                        </a>
                      </div>
                    )}

                    {/* ABOUT */}
                    <div style={{ marginBottom: "1.5rem" }}>
                      <h3 className="text-base font-semibold text-matrix-green terminal mb-2 opacity-70">
                        ABOUT:
                      </h3>
                      <p className="text-matrix-green text-base leading-relaxed opacity-90">
                        {partner.description}
                      </p>
                    </div>

                    {/* LINKS */}
                    <div style={{ marginBottom: "1.5rem" }}>
                     <h3 className="text-base font-semibold text-matrix-green terminal mb-2 opacity-70">
                      LINKS:
                    </h3>
                    <div className="flex flex-wrap gap-3">
                      {partner.links.map((link, idx) => (
                        <a key={idx} href={link.url} target="_blank" rel="noopener noreferrer" className="border-2 border-matrix-green text-matrix-green rounded hover:bg-matrix-green hover:text-black transition-all text-sm terminal font-semibold" style={{ padding: "0.5rem 1rem" }}>
                        {link.label}
                        </a>
                      ))}
                    </div>
                    </div>

                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
