//
//  LegalView.swift
//  BeMeh
//
//  HIPAA-style privacy notice and telehealth consent shown at sign-up.
//
//  IMPORTANT: This is template language, not legal advice, and displaying it
//  does not by itself make the app HIPAA compliant. Real compliance requires
//  Business Associate Agreements, encrypted infrastructure, access controls,
//  audit logging, breach procedures, and review by qualified counsel. Have a
//  lawyer finalize this before handling anyone's real health information.
//

import SwiftUI

struct LegalView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            AtmosphereBackground()
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("Privacy & Consent").eyebrowStyle()
                    Text("Your privacy, in plain terms")
                        .font(.display(30))
                        .foregroundStyle(Palette.ink)

                    disclaimer

                    section("Notice of Privacy Practices",
                            "BeMeh treats the photos, skin readings, and notes you share as protected health information (PHI). We describe here how that information is used and disclosed, and how you can get access to it, consistent with the HIPAA Privacy Rule.")

                    section("What we collect",
                            "Account details you enter, the images captured during a scan, the readings derived from them, and the notes your licensed esthetician records during a consult.")

                    section("How it's used",
                            "To provide your consult, produce your skin map and regimen, and — only with your direction — coordinate follow-up care. We do not sell your information, and we do not use your face images to train models.")

                    section("Your rights",
                            "You may view, correct, download, or delete your information at any time. Deletion removes your scans and notes from your account. You may withdraw consent for future processing by closing your account.")

                    section("Telehealth consent",
                            "Consults are delivered over live video. Video sessions are not recorded unless both you and your esthetician explicitly opt in. Care delivered here is limited to an esthetician's scope; anything beyond it is referred to a licensed physician.")

                    section("Security",
                            "Information is encrypted in transit and at rest, and access is limited to the esthetician you book and staff who support your care. If a breach affecting your PHI occurs, we will notify you as required by law.")

                    Button("Close") { dismiss() }
                        .buttonStyle(GoldButtonStyle(wide: true))
                        .padding(.top, 8)
                }
                .padding(20)
                .padding(.bottom, 20)
            }
        }
        .preferredColorScheme(.dark)
    }

    private var disclaimer: some View {
        Card {
            Text("This is a template privacy notice for review by counsel. It is not legal advice, and this build does not yet run on HIPAA-compliant infrastructure — do not enter real health information.")
                .font(.footnote)
                .foregroundStyle(Palette.copper)
        }
    }

    private func section(_ title: String, _ body: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title)
                .font(.label(15))
                .foregroundStyle(Palette.gold)
            Text(body)
                .font(.subheadline)
                .foregroundStyle(Palette.inkDim)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#Preview {
    LegalView()
}
