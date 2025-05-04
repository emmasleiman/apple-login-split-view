
import { useIsMobile } from "@/hooks/use-mobile";
import LoginForm from "@/components/LoginForm";

const Index = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-blue-500 overflow-hidden">
      {/* Login Form Section - Left Side on desktop, Top on mobile */}
      <div className="md:w-1/3 bg-white flex-1 flex flex-col items-center justify-center p-6 z-10 drop-shadow-xl">
        <div className="w-full max-w-md bg-white p-8 rounded-lg">
          <h2 className="text-2xl font-medium text-gray-800 mb-2 text-center">Sign in</h2>
          <p className="text-gray-500 text-sm text-center mb-6">Welcome to TraceMed</p>
          <LoginForm />
        </div>
      </div>
      
      {/* Content Section with wave background - Right Side on desktop, Bottom on mobile */}
      <div className="md:w-2/3 relative overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center p-10">
        {/* Wave patterns overlay */}
        <div className="absolute inset-0 wave-pattern opacity-20"></div>
        
        {/* Main content */}
        <div className="max-w-2xl relative z-10">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
            Everything <br/>
            <span className="text-blue-100">Healthcare</span> <br/>
            Teams <br/>
            Need
          </h1>
          <p className="text-blue-100 md:text-lg mt-6 max-w-md">
            Streamline patient tracking, improve infection control, 
            and enhance hospital workflow with our comprehensive healthcare management solution.
          </p>
          
          {/* Small circular accent */}
          <div className="mt-12 flex items-center">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
              <div className="h-2 w-2 bg-white rounded-full"></div>
            </div>
            <p className="text-blue-100 text-sm">Hospital infection control and patient management system</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
