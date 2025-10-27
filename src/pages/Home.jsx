export default function Home() {
    return (
        <div className="w-full min-h-screen flex flex-col justify-center items-center px-4 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
                Welcome to a Website Builder that’s Actually <span className="text-indigo-400">FREE!</span>
            </h1>
            <p className="text-xl md:text-2xl italic mb-6 text-center text-gray-300">
                I was always told — <strong>K</strong>eep <strong>I</strong>t <strong>S</strong>imple, <strong>S</strong>tupid <span className="text-sm">(KISS)</span>
            </p>
            <div className="text-center text-gray-200 leading-relaxed max-w-2xl">
                <p>
                    This isn’t loaded with flashy templates or subscription traps — just a clean,
                    straightforward builder that won’t drain your wallet.
                </p>
                <p className="mt-4">
                    <br />Eventually I'll add donate button somewhere, but thats it.
                </p>
                <br />
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
                    So get started!
                </h1>
                <p className="mt-4">
                    And bear with me while I try to make it cooler.
                </p>
            </div>
        </div>
    );
}
