//
//  ScanView.swift
//  BeMeh
//
//  Guided three-angle capture. This build simulates the camera so the flow runs
//  on the simulator and needs no permissions; the real app swaps the viewfinder
//  for an AVCaptureVideoPreviewLayer and reads angles from Vision landmarks.
//

import SwiftUI

struct ScanView: View {
    @EnvironmentObject private var state: AppState
    @State private var angle = 0
    @State private var finished = false
    @State private var sweep = false

    private let prompts = ["Look straight ahead", "Turn slightly left", "Turn slightly right"]

    var body: some View {
        ZStack {
            viewfinder

            VStack(spacing: 0) {
                VStack(spacing: 2) {
                    Text("Angle \(min(angle + 1, 3)) of 3").eyebrowStyle()
                    Text(finished ? "Captured" : prompts[min(angle, 2)])
                        .font(.display(24))
                        .foregroundStyle(Palette.ink)
                }
                .padding(.top, 12)

                Spacer()

                lightingCard
                    .padding(.horizontal, 18)

                dots
                    .padding(.top, 22)

                shutter
                    .padding(.top, 14)
                    .padding(.bottom, 12)
            }
        }
        .onAppear { sweep = true }
        .sheet(isPresented: $finished, onDismiss: reset) {
            ScanResultSheet()
                .presentationDetents([.medium])
                .presentationBackground(Palette.ground)
        }
    }

    private var viewfinder: some View {
        ZStack {
            RadialGradient(
                colors: [Color(red: 0.29, green: 0.22, blue: 0.15), Palette.ground],
                center: .init(x: 0.5, y: 0.4), startRadius: 20, endRadius: 380
            )
            .ignoresSafeArea()

            GeometryReader { geo in
                let w = geo.size.width * 0.58
                let h = w / 0.76

                Ellipse()
                    .strokeBorder(Palette.gold.opacity(0.75),
                                  style: StrokeStyle(lineWidth: 1.5, dash: [6, 6]))
                    .frame(width: w, height: h)
                    .position(x: geo.size.width / 2, y: geo.size.height * 0.42)

                Rectangle()
                    .fill(LinearGradient(colors: [.clear, Palette.gold, .clear],
                                         startPoint: .leading, endPoint: .trailing))
                    .frame(height: 2)
                    .padding(.horizontal, geo.size.width * 0.14)
                    .position(x: geo.size.width / 2,
                              y: geo.size.height * (sweep ? 0.58 : 0.26))
                    .animation(
                        .easeInOut(duration: 3.2).repeatForever(autoreverses: true),
                        value: sweep
                    )

                CornerBrackets()
                    .stroke(Palette.gold, lineWidth: 2)
                    .frame(width: geo.size.width * 0.74, height: h * 1.1)
                    .position(x: geo.size.width / 2, y: geo.size.height * 0.42)
            }
        }
    }

    private var lightingCard: some View {
        Card {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("Lighting")
                        .font(.label(13))
                        .foregroundStyle(Palette.ink)
                    Spacer()
                    Pill(text: "Normalized", tone: .good)
                }
                ProgressView(value: 0.86)
                    .tint(Palette.gold)
                Text("Warm indoor light detected — colors corrected to match your \(state.reading.capturedOn) scan.")
                    .font(.footnote)
                    .foregroundStyle(Palette.inkDim)
            }
        }
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var dots: some View {
        HStack(spacing: 7) {
            ForEach(0..<3, id: \.self) { i in
                Circle()
                    .fill(i < angle ? Palette.gold : Palette.ink.opacity(0.28))
                    .frame(width: 7, height: 7)
            }
        }
    }

    private var shutter: some View {
        Button(action: capture) {
            ZStack {
                Circle().strokeBorder(Palette.ink.opacity(0.9), lineWidth: 3)
                Circle().fill(Palette.goldFill).padding(6)
            }
            .frame(width: 66, height: 66)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Capture angle \(min(angle + 1, 3)) of 3")
    }

    private func capture() {
        guard !finished else { return }
        withAnimation(.easeOut(duration: 0.25)) {
            angle += 1
        }
        if angle >= 3 {
            state.completeScan()
            finished = true
        }
    }

    private func reset() {
        angle = 0
    }
}

/// Four camera-style corner marks around the capture area.
struct CornerBrackets: Shape {
    var arm: CGFloat = 22

    func path(in rect: CGRect) -> Path {
        var p = Path()
        // top-left
        p.move(to: CGPoint(x: rect.minX, y: rect.minY + arm))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.minX + arm, y: rect.minY))
        // top-right
        p.move(to: CGPoint(x: rect.maxX - arm, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.minY + arm))
        // bottom-right
        p.move(to: CGPoint(x: rect.maxX, y: rect.maxY - arm))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.maxX - arm, y: rect.maxY))
        // bottom-left
        p.move(to: CGPoint(x: rect.minX + arm, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY - arm))
        return p
    }
}

struct ScanResultSheet: View {
    @EnvironmentObject private var state: AppState
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Scan complete").eyebrowStyle()
            Text(state.reading.headline)
                .font(.display(30))
                .foregroundStyle(Palette.ink)

            HStack(spacing: 16) {
                RingGauge(value: state.reading.index, size: 88)
                Text(state.reading.detail)
                    .font(.subheadline)
                    .foregroundStyle(Palette.inkDim)
            }

            Text("Your esthetician sees this before the call starts.")
                .font(.footnote)
                .foregroundStyle(Palette.inkDim)

            Spacer()

            Button("Done") { dismiss() }
                .buttonStyle(GoldButtonStyle(wide: true))
        }
        .padding(22)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    ScanView().environmentObject(AppState())
}
