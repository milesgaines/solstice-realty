//
//  MeetingWebView.swift
//  BeMeh
//
//  A real, multi-party video meeting — Jitsi Meet embedded in a WKWebView over
//  WebRTC. No backend and no accounts: everyone who opens the same room URL is
//  in the same call, seeing and hearing each other. Jitsi renders its own
//  self-view, remote tiles, mute, and camera controls inside the web view.
//
//  The default host is the free public server meet.jit.si. If that server ever
//  asks the first participant to sign in as moderator, point JITSI_HOST at your
//  own Jitsi deployment or an 8x8 JaaS domain — it's the only line to change.
//

import SwiftUI
import WebKit

enum Meeting {
    static let host = "meet.jit.si"

    /// A stable room URL for a consult, so both people land in the same call.
    static func roomURL(pro: String, displayName: String) -> URL {
        let slug = "BeMehConsult" + pro.filter { $0.isLetter || $0.isNumber }
        let name = displayName.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "Guest"
        // Skip the prejoin lobby and pass the display name straight through.
        let fragment = "#config.prejoinPageEnabled=false&userInfo.displayName=\"\(name)\""
        return URL(string: "https://\(host)/\(slug)\(fragment)")!
    }
}

struct MeetingWebView: UIViewRepresentable {
    let url: URL

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let web = WKWebView(frame: .zero, configuration: config)
        web.uiDelegate = context.coordinator
        web.isOpaque = false
        web.scrollView.isScrollEnabled = false
        web.load(URLRequest(url: url))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    /// Auto-grants the camera/mic prompt WebRTC raises inside the web view, so
    /// the call connects without a second confirmation dialog.
    final class Coordinator: NSObject, WKUIDelegate {
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            decisionHandler(.grant)
        }
    }
}
