import { Link } from 'react-router-dom';
import tegaLogo from '@/assets/tega-logo.png';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gradient-dark">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 flex items-center gap-4">
          <Link to="/auth">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>
          <img src={tegaLogo} alt="TEGA" className="h-12 w-auto object-contain" />
        </div>

        <div className="prose prose-invert max-w-none space-y-6">
          <h1 className="font-display text-3xl font-bold text-foreground">
            <span className="text-gradient-gold">Terms</span> of Use
          </h1>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using the Transforming Education Global Awards (TEGA) website and services, you accept and agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our services.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">2. Use of Services</h2>
            <p>The TEGA website and services are provided for educational and informational purposes. You agree to use our services only for lawful purposes and in accordance with these Terms.</p>
            <p>You may not use our services to engage in any activity that is harmful, fraudulent, or illegal.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Registration and Account</h2>
            <p>When you register for TEGA or related events, you agree to provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Intellectual Property</h2>
            <p>All content on the TEGA website, including text, graphics, logos, and images, is the property of TEGA and its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Privacy</h2>
            <p>Your privacy is important to us. Please review our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> to understand how we collect, use, and protect your personal information.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Submission of Nominations</h2>
            <p>All nominations submitted through the TEGA Portal must be genuine, accurate, and properly documented. Fraudulent submissions, plagiarised content, or misrepresentation of institutional data will result in immediate disqualification and potential account suspension.</p>
            <p>By submitting a nomination, you grant TEGA the right to use submission details for evaluation, promotional, and archival purposes in connection with the awards programme.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">7. Payment and Fees</h2>
            <p>Certain services, including nomination submission, may require payment of a non-refundable processing fee. Payment is processed securely through our authorised payment partner. TEGA is not liable for any issues arising from third-party payment processors.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">8. Limitation of Liability</h2>
            <p>TEGA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of our services or inability to access our services.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">9. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms of Use at any time. Changes will be effective immediately upon posting to the website. Your continued use of our services constitutes acceptance of the modified terms.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">10. Contact</h2>
            <p>For questions about these Terms of Use, please contact us at: <a href="mailto:info@transformingeducation.ac" className="text-primary underline">info@transformingeducation.ac</a></p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">Last updated: February 2025</p>
        </div>
      </div>
    </div>
  );
}
