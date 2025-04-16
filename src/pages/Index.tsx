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
          src="/lovable-uploads/6e4d5ba9-b898-4255-93c1-5d3d0a7f7c28.png"
          alt="Arched window with scenic view"
          className="w-full h-full object-cover"
        />
        
        {/* Noise overlay */}
        <div className="absolute inset-0 bg-noise opacity-30"></div>
        
        {/* Dark gradient overlay to improve text visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent"></div>
      </div>
      
      {/* Login Form Section - Right Side on desktop, Bottom on mobile */}
      <div className="md:w-1/2 flex-1 bg-white flex flex-col items-center justify-center">
        <div className="w-full max-w-md px-6">
          <img 
            src="/lovable-uploads/3fa4235d-815a-4a5e-96df-a97a1d7312ea.png" 
            alt="TraceMed Logo" 
            className="h-48 mb-16 mx-auto object-contain"
          />
          <LoginForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
