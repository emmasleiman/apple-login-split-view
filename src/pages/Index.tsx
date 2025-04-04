
import { useIsMobile } from "@/hooks/use-mobile";
import LoginForm from "@/components/LoginForm";

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row">
      {/* Image Section - Left Side on desktop, Top on mobile */}
      <div className="md:w-1/2 h-[300px] md:h-screen relative overflow-hidden bg-blue-100">
        <img 
          src="/lovable-uploads/ce99aa03-eacd-4145-81c7-14be1222a55d.png"
          alt="Serene blue landscape"
          className="w-full h-full object-cover"
        />
        {!isMobile && (
          <div className="absolute bottom-8 left-8 text-white">
            <h2 className="text-2xl font-light">Serenity</h2>
            <p className="text-sm opacity-80">A place of calm</p>
          </div>
        )}
      </div>
      
      {/* Login Form Section - Right Side on desktop, Bottom on mobile */}
      <div className="md:w-1/2 flex-1 bg-white flex flex-col">
        <LoginForm />
      </div>
    </div>
  );
};

export default Index;
