# Password recovery email rollout

The legacy email button opens Supabase's verification URL immediately. Email
security scanners can consume that single-use token before the person opens it.
Its PKCE callback also requires the browser cookie from the original request.

The direct recovery link below opens the password-reset page without redeeming
the token. The page verifies it only after the person clicks **Continue to reset
password**, using `verifyOtp({ token_hash, type: "recovery" })`. This works when
the email opens on another device or in a private browser because it does not
exchange a browser-bound PKCE code. The valid recovery token remains required.

## Deploy, then update the hosted recovery template

1. Deploy the frontend containing the confirmation step to `www.swimbuddz.com`.
2. In the production Supabase project (`kldveuapcbmspvncxkpl`), open
   **Authentication → Emails → Reset password**.
3. Preserve the email's subject, branding, and other links. Replace only the
   reset-action anchor's `href="{{ .ConfirmationURL }}"` with:

   ```html
   href="https://www.swimbuddz.com/reset-password#token_hash={{ .TokenHash }}&amp;type=recovery"
   ```

   The complete action anchor can be:

   ```html
   <a href="https://www.swimbuddz.com/reset-password#token_hash={{ .TokenHash }}&amp;type=recovery">Reset Password</a>
   ```

4. Remove any other recovery-action link or fallback that still points to
   `{{ .ConfirmationURL }}`. Keep unrelated links intact. A scanner following a
   leftover automatic verification link can still consume the token.
5. Disable click tracking on authentication emails in Brevo when available.
6. Save the hosted template and request a fresh recovery email. Existing emails
   are unchanged and consumed tokens cannot be repaired.

The fragment keeps the token out of HTTP request logs and referrer headers. The
page removes it from the visible URL while retaining it in that browser history
entry until verification, so refreshing still verifies the intended account.
Successful verification removes the retained token.

## Verify the deployment

- Opening the fresh email's button should show **Continue to reset password**.
- Merely loading the page must not verify the token or show password fields.
- Continuing with a valid token must reveal the password form, including when
  opened in a different/private browser from the original request.
- An invalid or reused token must show a useful error and a new-link option.
- Only the recipient should enter and submit their new password.

Saving this file in Git does not update the hosted Supabase template. That
template change is required to activate this flow. Neither the Site URL nor
existing allowed redirect entries need changing for this direct template link.

## Sources

- [Supabase email prefetching and tracking](https://supabase.com/docs/guides/auth/auth-email-templates#limitations)
- [Supabase token-hash verification](https://supabase.com/docs/guides/auth/auth-email-templates#redirecting-the-user-to-a-server-side-endpoint)
- [PKCE browser requirement](https://supabase.com/docs/guides/auth/sessions/pkce-flow#limitations)
