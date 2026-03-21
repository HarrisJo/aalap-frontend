import { useState } from 'react';
import { AuthService } from '../services/AuthService';

export default function AuthPage() {
    // 1. UI Switches
    const [isLoginPage, setIsLoginPage] = useState(true);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 2. Data Capture
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [registerStageName, setRegisterStageName] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');

    // 3. ACTUAL BACKEND CONNECTION HANDLERS
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await AuthService.login(loginEmail, loginPassword);
            localStorage.setItem("token", data.token);
            console.log("LOGIN SUCCESS:", data);
            alert("Studio access granted! Welcome back.");
            // Here we would normally redirect to the Dashboard
        } catch (error: any) {
            console.error("LOGIN ERROR:", error);
            alert(error.response?.data?.message || "Login failed. Check your connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = await AuthService.register(registerStageName, registerEmail, registerPassword);
            localStorage.setItem("token", data.token);
            console.log("REGISTER SUCCESS:", data);
            alert("Account created! Welcome to the network.");
            // Here we would normally redirect to the Dashboard
        } catch (error: any) {
            console.error("REGISTER ERROR:", error);
            alert(error.response?.data?.message || "Registration failed. Stage name or Email might be taken.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center p-4 font-['DM_Sans'] overflow-hidden">

            {/* BACKGROUND VIDEO SECTION */}
            <div className="absolute inset-0 bg-[#111817] -z-30"></div>
            <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover -z-20">
                <source src="/studio.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-[#111817]/80 -z-10"></div>

            {/* AMBIENT EFFECTS & WATERMARK */}
            <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-[#FF4439] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse pointer-events-none z-0"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#475B5A] rounded-full mix-blend-screen filter blur-[120px] opacity-30 pointer-events-none z-0"></div>
            <div className="absolute top-[48%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center z-0 pointer-events-none text-white opacity-[0.02]">
                <h1 className="text-[24vw] font-['Bebas_Neue'] tracking-tighter leading-none select-none">AALAP</h1>
            </div>

            {/* THE INNER STAGE */}
            <div className="relative w-full max-w-4xl h-[520px] bg-white/[0.03] backdrop-blur-[40px] rounded-[2.5rem] overflow-hidden flex border border-white/10 z-10 shadow-[0_0_100px_rgba(0,0,0,0.4)]">

                {/* ==================== LEFT SIDE: LOGIN FORM ==================== */}
                <div className="w-1/2 h-full flex flex-col items-center justify-center p-10 relative bg-black/10">
                    <div className="absolute top-8 left-8 opacity-20 font-['Bebas_Neue'] text-3xl text-[#FFD4CA] tracking-widest">01 / LOGIN</div>
                    <h2 className="text-5xl font-normal font-['Bebas_Neue'] text-[#FCFCFC] tracking-wide mb-1 mt-4 drop-shadow-md">WELCOME BACK</h2>
                    <p className="font-['Cormorant_Garamond'] italic text-lg text-[#FFD4CA] opacity-80 mb-6 text-center">Your threads are waiting.</p>

                    <form onSubmit={handleLogin} className="w-full max-w-[320px] flex flex-col gap-3">
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] uppercase tracking-widest text-[#FFD4CA] opacity-70 font-bold ml-1">Email Address</label>
                            <input
                                type="email"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                                placeholder="ravi@gmail.com"
                                className="w-full bg-white/[0.05] border border-white/10 text-[#FCFCFC] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#FFD4CA]/50 focus:bg-white/[0.1] transition-all duration-300 placeholder:text-gray-600 text-sm"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-full relative">
                            <label className="text-[10px] uppercase tracking-widest text-[#FFD4CA] opacity-70 font-bold ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showLoginPassword ? "text" : "password"}
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/[0.05] border border-white/10 text-[#FCFCFC] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#FFD4CA]/50 focus:bg-white/[0.1] transition-all duration-300 placeholder:text-gray-600 text-sm pr-10"
                                    required
                                />
                                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FFD4CA] transition-colors">
                                    {showLoginPassword ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`mt-2 w-full bg-[#FF4439] hover:bg-[#B72F30] text-white px-8 py-3 rounded-xl font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-[0_0_20px_rgba(255,68,57,0.2)] hover:shadow-[0_0_30px_rgba(183,47,48,0.4)] hover:-translate-y-0.5 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'SYNCING...' : 'ENTER STUDIO'}
                        </button>
                    </form>
                </div>

                {/* ==================== RIGHT SIDE: REGISTER FORM ==================== */}
                <div className="w-1/2 h-full flex flex-col items-center justify-center p-10 relative bg-black/5">
                    <div className="absolute top-8 right-8 opacity-20 font-['Bebas_Neue'] text-3xl text-[#FFD4CA] tracking-widest text-right">02 / JOIN</div>
                    <h2 className="text-5xl font-normal font-['Bebas_Neue'] text-[#FCFCFC] tracking-wide mb-1 mt-4 drop-shadow-md">START CREATING</h2>
                    <p className="font-['Cormorant_Garamond'] italic text-lg text-[#FFD4CA] opacity-80 mb-6 text-center">Connecting the talents.</p>

                    <form onSubmit={handleRegister} className="w-full max-w-[320px] flex flex-col gap-3">
                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] uppercase tracking-widest text-[#FFD4CA] opacity-70 font-bold ml-1">Stage Name</label>
                            <input
                                type="text"
                                value={registerStageName}
                                onChange={(e) => setRegisterStageName(e.target.value)}
                                placeholder="e.g. Ravi"
                                className="w-full bg-white/[0.05] border border-white/10 text-[#FCFCFC] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#FFD4CA]/50 focus:bg-white/[0.1] transition-all duration-300 placeholder:text-gray-600 text-sm"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-full">
                            <label className="text-[10px] uppercase tracking-widest text-[#FFD4CA] opacity-70 font-bold ml-1">Email Address</label>
                            <input
                                type="email"
                                value={registerEmail}
                                onChange={(e) => setRegisterEmail(e.target.value)}
                                placeholder="ravi@gmail.com"
                                className="w-full bg-white/[0.05] border border-white/10 text-[#FCFCFC] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#FFD4CA]/50 focus:bg-white/[0.1] transition-all duration-300 placeholder:text-gray-600 text-sm"
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1 w-full relative">
                            <label className="text-[10px] uppercase tracking-widest text-[#FFD4CA] opacity-70 font-bold ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showRegisterPassword ? "text" : "password"}
                                    value={registerPassword}
                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/[0.05] border border-white/10 text-[#FCFCFC] px-4 py-2.5 rounded-xl focus:outline-none focus:border-[#FFD4CA]/50 focus:bg-white/[0.1] transition-all duration-300 placeholder:text-gray-600 text-sm pr-10"
                                    required
                                />
                                <button type="button" onClick={() => setShowRegisterPassword(!showRegisterPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#FFD4CA] transition-colors">
                                    {showRegisterPassword ? <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                                        : <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`mt-2 w-full bg-[#FF4439] hover:bg-[#B72F30] text-white px-8 py-3 rounded-xl font-bold tracking-widest uppercase text-xs transition-all duration-300 shadow-[0_0_20px_rgba(255,68,57,0.2)] hover:shadow-[0_0_30px_rgba(183,47,48,0.4)] hover:-translate-y-0.5 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLoading ? 'CREATING...' : 'JOIN THE NETWORK'}
                        </button>
                    </form>
                </div>

                {/* SLIDING COVER */}
                <div className={`absolute top-0 left-0 w-1/2 h-full flex flex-col items-center justify-center p-10 text-center transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] z-20 shadow-[0_0_60px_rgba(0,0,0,0.7)] border-r border-l border-white/5 ${isLoginPage ? 'translate-x-full' : 'translate-x-0'}`}>
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80')] bg-cover bg-center z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-[#475B5A]/95 to-[#111817]/95 z-0 mix-blend-multiply"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-12 h-1 bg-[#FF4439] rounded-full mb-6 shadow-[0_0_15px_rgba(255,68,57,0.6)]"></div>
                        <h2 className="text-6xl leading-none font-normal font-['Bebas_Neue'] text-[#FCFCFC] tracking-widest mb-4 drop-shadow-lg">{isLoginPage ? 'NEW HERE?' : 'HELLO AGAIN.'}</h2>
                        <p className="font-['Cormorant_Garamond'] italic text-2xl mb-10 opacity-90 px-4 leading-relaxed text-[#FFD4CA]">
                            {isLoginPage ? 'Aalap is where songs are born. Find your missing pieces today.' : 'The global studio is waiting. Step inside and let the music flow.'}
                        </p>
                        <button onClick={() => setIsLoginPage(!isLoginPage)} className="group relative px-8 py-3.5 rounded-full font-bold tracking-widest uppercase text-xs overflow-hidden border border-[#FFD4CA]/50 text-[#FFD4CA] transition-all duration-500 hover:border-[#FFD4CA] backdrop-blur-sm">
                            <span className="relative z-10 transition-colors duration-500 group-hover:text-[#2A3837]">{isLoginPage ? 'Create an Account' : 'Sign In'}</span>
                            <div className="absolute inset-0 bg-[#FFD4CA] transform scale-x-0 origin-left transition-transform duration-500 group-hover:scale-x-100 z-0"></div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}