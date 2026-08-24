   "use client";
   import dynamic from "next/dynamic";
   
   const PartnersClient = dynamic(() => import("./PartnersClient"), {
     ssr: false,
   });
   
   export default function PartnersWrapper() {
     return <PartnersClient />;
   }
