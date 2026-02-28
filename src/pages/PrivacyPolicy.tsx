import { Link } from 'react-router-dom';
import tegaLogo from '@/assets/tega-logo.png';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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
            <span className="text-gradient-gold">Privacy</span> Policy
          </h1>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect information that you provide directly to us when you create an account, submit a nomination, or contact us. This includes your name, email address, phone number, country, institution details, and any supporting documents you upload.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Process and evaluate your TEGA Awards nominations</li>
              <li>Communicate with you about your application status</li>
              <li>Send you notifications and updates about the awards programme</li>
              <li>Improve our services and user experience</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">3. Data Sharing</h2>
            <p>We do not sell your personal information. We may share your data with:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Judges and panel members for the purpose of evaluating your nomination</li>
              <li>Payment processors for transaction processing</li>
              <li>Service providers who assist us in operating our platform</li>
              <li>Legal authorities when required by law</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">4. Data Security</h2>
            <p>We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. All data is encrypted in transit and at rest.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">5. Data Retention</h2>
            <p>We retain your personal information for as long as necessary to fulfil the purposes described in this policy, or as required by law. You may request deletion of your data by contacting us.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the personal information we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Withdraw consent for data processing</li>
              <li>Lodge a complaint with a data protection authority</li>
            </ul>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">7. Cookies</h2>
            <p>We use essential cookies to maintain your session and preferences. We do not use tracking or advertising cookies.</p>
          </section>

          <section className="space-y-3 text-sm text-muted-foreground">
            <h2 className="font-display text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For questions about this Privacy Policy, please contact us at: <a href="mailto:info@transformingeducation.ac" className="text-primary underline">info@transformingeducation.ac</a></p>
          </section>

          <p className="text-xs text-muted-foreground pt-4 border-t border-border">Last updated: February 2025</p>
        </div>
      </div>
    </div>
  );
}
