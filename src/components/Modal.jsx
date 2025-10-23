import React, { useEffect } from "react";

export default function Modal({ isOpen = true, onClose, title, children, maxWidth = "28rem" }) {
	useEffect(() => {
		const onKey = (e) => {
			if (e.key === "Escape") onClose?.();
		};
		if (isOpen) window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [isOpen, onClose]);

	if (!isOpen) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative bg-white rounded-lg shadow-lg w-full" style={{ maxWidth }}>
				{(title || onClose) && (
					<div className="flex items-center justify-between p-3 border-b">
						<div className="font-semibold">{title}</div>
						{onClose && (
							<button type="button" className="px-2 py-1 text-gray-600 hover:text-black" onClick={onClose} aria-label="Close">
								✕
							</button>
						)}
					</div>
				)}
						<div className="p-4 flex justify-center">{children}</div>
			</div>
		</div>
	);
}

