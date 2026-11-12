import Hero from "@/components/sections/Hero";
import Experiences from "@/components/sections/Experiences";
import AboutCar from "@/components/sections/AboutCar";
import Gallery from "@/components/sections/Gallery";
import Testimonials from "@/components/sections/Testimonials";
import Investment from "@/components/sections/Investment";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/sections/Footer";
import { getDadosLanding } from "@/lib/landing/dados";
import { precoCarroDaNoiva } from "@/lib/landing/servicos";

// Montada no servidor e guardada por até 1 minuto. Mudar foto do topo, galeria, configuração ou datas no
// painel a refaz na hora (src/lib/landing/revalidar.ts); valores de Regras chegam em até 1 minuto.
export const revalidate = 60;

export default async function Page() {
  const dados = await getDadosLanding();

  return (
    <main>
      <Hero topo={dados.topo} heroOpacity={dados.heroOpacity} />
      <Experiences />
      <AboutCar />
      <Gallery fotos={dados.galeria} />
      <Testimonials />
      <Investment precoNoivaCents={precoCarroDaNoiva(dados.servicos)} showCalendar={dados.showCalendar} />
      <Faq />
      <Footer />
    </main>
  );
}
