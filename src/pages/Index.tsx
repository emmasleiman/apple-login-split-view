
import { useIsMobile } from "@/hooks/use-mobile";
import LoginForm from "@/components/LoginForm";

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-white">
      {/* Image Section with noise overlay - Left Side on desktop, Top on mobile */}
      <div className="md:w-1/2 h-[300px] md:h-screen relative overflow-hidden">
        {/* Base image */}
        <img 
          src="/lovable-uploads/ce99aa03-eacd-4145-81c7-14be1222a55d.png"
          alt="Serene landscape"
          className="w-full h-full object-cover"
        />
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-noise opacity-30"></div>
        
        {/* Dark gradient overlay to improve text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent"></div>
        
        {/* Text overlay */}
        <div className="absolute bottom-8 left-8 text-white">
          <h2 className="text-3xl md:text-4xl font-light tracking-tight">TraceMed</h2>
          <p className="text-base md:text-lg opacity-80">Precision Tracking for Safer Care</p>
        </div>
      </div>
      
      {/* Login Form Section - Right Side on desktop, Bottom on mobile */}
      <div className="md:w-1/2 flex-1 bg-white flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-6">
          <h1 className="text-3xl md:text-4xl text-gray-800 font-light mb-2 tracking-tight">TraceMed</h1>
          <p className="text-lg md:text-xl text-gray-500 mb-12">Sign in to your account</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
