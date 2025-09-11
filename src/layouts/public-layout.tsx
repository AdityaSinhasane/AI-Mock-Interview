import Footer from "@/components/footer";
import Header from "@/components/header";
import { Outlet } from "react-router";

function PublicLayout() {
  return (
    <div className="w-full">
      {/*handler to store the user data */}
      <Header/>
      <Outlet/>
      <Footer/>
    </div>
  )
}

export default PublicLayout;
