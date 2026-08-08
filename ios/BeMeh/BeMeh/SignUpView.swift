//
//  SignUpView.swift
//  BeMeh
//
//  The account gate shown before the main app. Local only — no backend — so
//  "creating an account" just unlocks the tabs and remembers a first name.
//

import SwiftUI

struct SignUpView: View {
    @EnvironmentObject private var state: AppState

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var agreed = false
    @State private var showLegal = false

    private var canSubmit: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
            && email.contains("@")
            && password.count >= 6
            && agreed
    }

    var body: some View {
        ZStack {
            AtmosphereBackground()

            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 12) {
                        Emblem(size: 96)
                        Text("BeMeh")
                            .font(.display(44))
                            .foregroundStyle(Palette.ink)
                        Text("Elevated beauty — book a licensed esthetician from wherever you are.")
                            .font(.subheadline)
                            .foregroundStyle(Palette.inkDim)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 32)

                    VStack(spacing: 12) {
                        field("Full name", text: $name)
                        field("Email", text: $email)
                        secureField("Password (6+ characters)", text: $password)

                        Toggle(isOn: $agreed) {
                            Text("I agree to the Terms & HIPAA Privacy Notice")
                                .font(.footnote)
                                .foregroundStyle(Palette.inkDim)
                        }
                        .tint(Palette.gold)

                        Button("Read the Privacy Notice") { showLegal = true }
                            .buttonStyle(GhostButtonStyle(wide: true))
                    }

                    Button("Create account") {
                        Haptic.success()
                        let first = name.split(separator: " ").first.map(String.init) ?? name
                        state.clientFirstName = first.isEmpty ? "there" : first
                        withAnimation(.easeOut(duration: 0.35)) { state.isSignedUp = true }
                    }
                    .buttonStyle(GoldButtonStyle(wide: true))
                    .opacity(canSubmit ? 1 : 0.5)
                    .disabled(!canSubmit)

                    Button("I already have an account") {
                        state.clientFirstName = "there"
                        withAnimation { state.isSignedUp = true }
                    }
                    .buttonStyle(.plain)
                    .font(.footnote)
                    .foregroundStyle(Palette.gold)

                    Text("Demo build — no real account is created and nothing is sent anywhere.")
                        .font(.caption)
                        .foregroundStyle(Palette.inkDim)
                        .multilineTextAlignment(.center)
                        .padding(.top, 4)
                }
                .padding(20)
                .padding(.bottom, 20)
            }
        }
        .preferredColorScheme(.dark)
        .sheet(isPresented: $showLegal) {
            LegalView()
        }
    }

    private func field(_ placeholder: String, text: Binding<String>) -> some View {
        TextField("", text: text, prompt: Text(placeholder).foregroundColor(Palette.inkDim))
            .foregroundStyle(Palette.ink)
            .padding(14)
            .background(fieldBackground)
    }

    private func secureField(_ placeholder: String, text: Binding<String>) -> some View {
        SecureField("", text: text, prompt: Text(placeholder).foregroundColor(Palette.inkDim))
            .foregroundStyle(Palette.ink)
            .padding(14)
            .background(fieldBackground)
    }

    private var fieldBackground: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .fill(Palette.panel)
            .overlay {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(Palette.hairline, lineWidth: 1)
            }
    }
}

struct SignUpView_Previews: PreviewProvider {
    static var previews: some View { SignUpView().environmentObject(AppState()) }
}
