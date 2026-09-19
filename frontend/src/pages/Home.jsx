
import PageTitle from "../components/PageTitle";
import Hero from "../components/Hero";
import FlashSales from "../components/FlashSales";
import Categories from "../components/Categories";
import PopularShops from "../components/PopularShops";
import PopularProducts from "../components/PopularProducts";

function Home() {
  return (
    <>
      <PageTitle
        title="Achetez et vendez local au Sénégal"
        description="Mon Commerce Sénégal : la plateforme sénégalaise pour découvrir des boutiques locales, acheter des produits et vendre en ligne partout au Sénégal, avec paiement sécurisé PayTech."
      />
      <Hero />
      <FlashSales />
      <Categories />
      <PopularShops />
      <PopularProducts />
    </>
  );
}

export default Home;

