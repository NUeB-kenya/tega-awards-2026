/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

const LOGO_URL = 'https://tqagkqiodmegvfdycwtq.supabase.co/storage/v1/object/public/email-assets/tega-logo.png'

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've been invited to the TEGA Awards Portal</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="TEGA Awards" width="140" height="auto" style={{ marginBottom: '24px' }} />
        <Heading style={h1}>You've Been Invited</Heading>
        <Text style={text}>
          You've been invited to join the{' '}
          <Link href={siteUrl} style={link}><strong>TEGA Awards Portal</strong></Link>. Click the button below to accept the invitation and create your account.
        </Text>
        <Button style={button} href={confirmationUrl}>Accept Invitation</Button>
        <Text style={footer}>If you weren't expecting this invitation, you can safely ignore this email.</Text>
        <Text style={footerBrand}>— The TEGA Awards Secretariat</Text>
      </Container>
    </Body>
  </Html>
)

export default InviteEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1d2b', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#555555', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#D4A017', textDecoration: 'underline' }
const button = { backgroundColor: '#D4A017', color: '#1a1d2b', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const footerBrand = { fontSize: '13px', color: '#D4A017', margin: '10px 0 0', fontStyle: 'italic' as const }
