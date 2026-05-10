import Hero from "@/components/sections/Hero";
import Experiences from "@/components/sections/Experiences";
import AboutCar from "@/components/sections/AboutCar";
import Gallery from "@/components/sections/Gallery";
import Testimonials from "@/components/sections/Testimonials";
import Investment from "@/components/sections/Investment";
import Faq from "@/components/sections/Faq";
import Footer from "@/components/sections/Footer";

export default function Home() {
  return (
    <main>
      <Hero />
      <Experiences />
      <AboutCar />
      <Gallery />
      <Testimonials />
      <Investment />
      <Faq />
      <Footer />
    </main>
  );
}
