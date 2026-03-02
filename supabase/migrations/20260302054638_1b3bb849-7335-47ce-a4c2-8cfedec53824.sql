
-- Fix ALL RLS policies: they were created as RESTRICTIVE which blocks all access.
-- PostgreSQL requires at least one PERMISSIVE policy for access. Recreate all as PERMISSIVE.

-- ===== COUNTRIES =====
DROP POLICY IF EXISTS "Anyone can read countries" ON public.countries;
CREATE POLICY "Anyone can read countries" ON public.countries FOR SELECT USING (true);

-- ===== REGIONS =====
DROP POLICY IF EXISTS "Anyone can read regions" ON public.regions;
CREATE POLICY "Anyone can read regions" ON public.regions FOR SELECT USING (true);

-- ===== CATEGORIES =====
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
DROP POLICY IF EXISTS "Admin/secretariat manage categories" ON public.categories;
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin/secretariat manage categories" ON public.categories FOR ALL USING (is_secretariat() OR is_admin()) WITH CHECK (is_secretariat() OR is_admin());

-- ===== PROFILES =====
DROP POLICY IF EXISTS "Users read own profile or elevated roles read all" ON public.profiles;
DROP POLICY IF EXISTS "System inserts profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users read own profile or elevated roles read all" ON public.profiles FOR SELECT USING (
  user_id = auth.uid() OR is_secretariat() OR is_judge() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "System inserts profiles" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());

-- ===== USER_ROLES =====
DROP POLICY IF EXISTS "Users read own role or elevated roles" ON public.user_roles;
DROP POLICY IF EXISTS "Secretariat manages roles" ON public.user_roles;
DROP POLICY IF EXISTS "Secretariat updates roles" ON public.user_roles;
DROP POLICY IF EXISTS "Secretariat deletes roles" ON public.user_roles;
CREATE POLICY "Users read own role or elevated roles" ON public.user_roles FOR SELECT USING (
  user_id = auth.uid() OR is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Secretariat manages roles" ON public.user_roles FOR INSERT WITH CHECK (is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Secretariat updates roles" ON public.user_roles FOR UPDATE USING (is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Secretariat deletes roles" ON public.user_roles FOR DELETE USING (is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ===== SUBMISSIONS =====
DROP POLICY IF EXISTS "Submitter or elevated roles read submissions" ON public.submissions;
DROP POLICY IF EXISTS "Submitter creates submissions" ON public.submissions;
DROP POLICY IF EXISTS "Submitter or elevated roles update submissions" ON public.submissions;
DROP POLICY IF EXISTS "Secretariat deletes submissions" ON public.submissions;
CREATE POLICY "Submitter or elevated roles read submissions" ON public.submissions FOR SELECT USING (
  submitter_id = auth.uid() OR is_judge() OR is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Submitter creates submissions" ON public.submissions FOR INSERT WITH CHECK (submitter_id = auth.uid() AND is_submitter());
CREATE POLICY "Submitter or elevated roles update submissions" ON public.submissions FOR UPDATE USING (
  submitter_id = auth.uid() OR is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
) WITH CHECK (
  submitter_id = auth.uid() OR is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Secretariat deletes submissions" ON public.submissions FOR DELETE USING (is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- ===== NOTIFICATIONS =====
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "System inserts notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System inserts notifications" ON public.notifications FOR INSERT WITH CHECK (
  is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR user_id = auth.uid()
);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- ===== PAYMENTS =====
DROP POLICY IF EXISTS "Users read own payments or admin" ON public.payments;
DROP POLICY IF EXISTS "Users insert own payments" ON public.payments;
DROP POLICY IF EXISTS "Admin/secretariat manage payments" ON public.payments;
CREATE POLICY "Users read own payments or admin" ON public.payments FOR SELECT USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = payments.submission_id AND s.submitter_id = auth.uid())
  OR is_secretariat() OR is_admin() OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Users insert own payments" ON public.payments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = payments.submission_id AND s.submitter_id = auth.uid())
);
CREATE POLICY "Admin/secretariat manage payments" ON public.payments FOR ALL USING (is_secretariat() OR is_admin()) WITH CHECK (is_secretariat() OR is_admin());

-- ===== SCORES =====
DROP POLICY IF EXISTS "Judge/secretariat/admin reads scores" ON public.scores;
DROP POLICY IF EXISTS "Judge creates scores" ON public.scores;
DROP POLICY IF EXISTS "Judge updates own scores" ON public.scores;
DROP POLICY IF EXISTS "Secretariat deletes scores" ON public.scores;
CREATE POLICY "Judge/secretariat/admin reads scores" ON public.scores FOR SELECT USING (
  judge_id = auth.uid() OR is_secretariat() OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
);
CREATE POLICY "Judge creates scores" ON public.scores FOR INSERT WITH CHECK (judge_id = auth.uid() AND is_judge());
CREATE POLICY "Judge updates own scores" ON public.scores FOR UPDATE USING (judge_id = auth.uid() AND is_judge());
CREATE POLICY "Secretariat deletes scores" ON public.scores FOR DELETE USING (is_secretariat());

-- ===== PANELS =====
DROP POLICY IF EXISTS "Authenticated read panels" ON public.panels;
DROP POLICY IF EXISTS "Admin/secretariat manage panels" ON public.panels;
DROP POLICY IF EXISTS "Admin/secretariat delete panels" ON public.panels;
CREATE POLICY "Authenticated read panels" ON public.panels FOR SELECT USING (true);
CREATE POLICY "Admin/secretariat manage panels" ON public.panels FOR ALL USING (is_secretariat() OR is_admin()) WITH CHECK (is_secretariat() OR is_admin());

-- ===== PANEL_JUDGES =====
DROP POLICY IF EXISTS "Authenticated read panel_judges" ON public.panel_judges;
DROP POLICY IF EXISTS "Admin/secretariat manage panel_judges" ON public.panel_judges;
CREATE POLICY "Authenticated read panel_judges" ON public.panel_judges FOR SELECT USING (true);
CREATE POLICY "Admin/secretariat manage panel_judges" ON public.panel_judges FOR ALL USING (is_secretariat() OR is_admin()) WITH CHECK (is_secretariat() OR is_admin());

-- ===== JUDGE_ASSIGNMENTS =====
DROP POLICY IF EXISTS "Judges manage own assignments" ON public.judge_assignments;
DROP POLICY IF EXISTS "Secretariat manage assignments" ON public.judge_assignments;
DROP POLICY IF EXISTS "Secretariat/admin read assignments" ON public.judge_assignments;
CREATE POLICY "Judges manage own assignments" ON public.judge_assignments FOR ALL USING (judge_id = auth.uid() AND is_judge()) WITH CHECK (judge_id = auth.uid() AND is_judge());
CREATE POLICY "Secretariat manage assignments" ON public.judge_assignments FOR ALL USING (is_secretariat()) WITH CHECK (is_secretariat());
CREATE POLICY "Secretariat/admin read assignments" ON public.judge_assignments FOR SELECT USING (is_secretariat() OR has_role(auth.uid(), 'admin'));

-- ===== EVIDENCE_FILES =====
DROP POLICY IF EXISTS "Applicants manage own evidence" ON public.evidence_files;
DROP POLICY IF EXISTS "Judges/secretariat read evidence" ON public.evidence_files;
CREATE POLICY "Applicants manage own evidence" ON public.evidence_files FOR ALL USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = evidence_files.submission_id AND s.submitter_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = evidence_files.submission_id AND s.submitter_id = auth.uid())
);
CREATE POLICY "Judges/secretariat read evidence" ON public.evidence_files FOR SELECT USING (is_judge() OR is_secretariat() OR is_admin());

-- ===== SUBMISSION_DOCUMENTS =====
DROP POLICY IF EXISTS "Applicants manage own docs" ON public.submission_documents;
DROP POLICY IF EXISTS "Judges read assigned docs" ON public.submission_documents;
CREATE POLICY "Applicants manage own docs" ON public.submission_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_documents.submission_id AND s.submitter_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM submissions s WHERE s.id = submission_documents.submission_id AND s.submitter_id = auth.uid())
);
CREATE POLICY "Judges read assigned docs" ON public.submission_documents FOR SELECT USING (is_judge() OR is_secretariat() OR has_role(auth.uid(), 'admin'));

-- ===== CONFLICT_DECLARATIONS =====
DROP POLICY IF EXISTS "Judges manage own COI" ON public.conflict_declarations;
DROP POLICY IF EXISTS "Secretariat reads all COI" ON public.conflict_declarations;
CREATE POLICY "Judges manage own COI" ON public.conflict_declarations FOR ALL USING (judge_id = auth.uid() AND is_judge()) WITH CHECK (judge_id = auth.uid() AND is_judge());
CREATE POLICY "Secretariat reads all COI" ON public.conflict_declarations FOR SELECT USING (is_secretariat() OR is_admin());

-- ===== AUDIT_LOGS =====
DROP POLICY IF EXISTS "Admin/secretariat read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.audit_logs;
CREATE POLICY "Admin/secretariat read audit logs" ON public.audit_logs FOR SELECT USING (is_secretariat() OR is_admin());
CREATE POLICY "Authenticated insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (user_id = auth.uid());
