CREATE TABLE trade_licensing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  state TEXT NOT NULL,
  trade_category TEXT NOT NULL,
  license_required BOOLEAN NOT NULL,
  license_type TEXT,
  homeowner_exemption BOOLEAN NOT NULL DEFAULT true,
  homeowner_exemption_notes TEXT,
  source_url TEXT,
  last_verified DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(state, trade_category)
);

ALTER TABLE trade_licensing_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read licensing rules"
  ON trade_licensing_rules FOR SELECT
  USING (auth.role() = 'authenticated');

COMMENT ON TABLE trade_licensing_rules IS 'Trade licensing requirements by state, used for expert licensing gap detection';

-- Seed data: 4 trades x 10 states = 40 rows
-- Trades: electrical, plumbing, hvac, general
-- States: MI, CA, TX, FL, NY, PA, OH, IL, GA, NC

INSERT INTO trade_licensing_rules (state, trade_category, license_required, license_type, homeowner_exemption, homeowner_exemption_notes, source_url, last_verified) VALUES
-- Michigan
('MI', 'electrical', true, 'Licensed Electrical Contractor', true, 'Homeowners may perform electrical work on their own residence with a homeowner permit', 'https://www.michigan.gov/lara/bureau-list/bcc/licenses', '2026-03-12'),
('MI', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own residence with a homeowner permit', 'https://www.michigan.gov/lara/bureau-list/bcc/licenses', '2026-03-12'),
('MI', 'hvac', true, 'Licensed Mechanical Contractor', true, 'Homeowners may perform HVAC work on their own residence; refrigerant handling requires EPA certification', 'https://www.michigan.gov/lara/bureau-list/bcc/licenses', '2026-03-12'),
('MI', 'general', true, 'Residential Builder License', true, 'Homeowners are exempt when working on their own residence', 'https://www.michigan.gov/lara/bureau-list/bcc/licenses', '2026-03-12'),

-- California
('CA', 'electrical', true, 'C-10 Electrical Contractor License', true, 'Homeowners may perform electrical work on their own residence valued under $500', 'https://www.cslb.ca.gov/About_Us/Library/Licensing_Classifications/', '2026-03-12'),
('CA', 'plumbing', true, 'C-36 Plumbing Contractor License', true, 'Homeowners may perform plumbing work on their own residence valued under $500', 'https://www.cslb.ca.gov/About_Us/Library/Licensing_Classifications/', '2026-03-12'),
('CA', 'hvac', true, 'C-20 HVAC Contractor License', true, 'Homeowners may perform HVAC work on their own residence valued under $500; refrigerant work requires EPA certification', 'https://www.cslb.ca.gov/About_Us/Library/Licensing_Classifications/', '2026-03-12'),
('CA', 'general', true, 'B General Building Contractor License', true, 'Homeowners may perform general work on their own residence valued under $500', 'https://www.cslb.ca.gov/About_Us/Library/Licensing_Classifications/', '2026-03-12'),

-- Texas
('TX', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own homestead residence', 'https://www.tdlr.texas.gov/electricians/electricians.htm', '2026-03-12'),
('TX', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own homestead residence', 'https://www.tsbpe.texas.gov/', '2026-03-12'),
('TX', 'hvac', true, 'HVAC Technician License', true, 'Homeowners may perform HVAC work on their own homestead; refrigerant requires EPA certification', 'https://www.tdlr.texas.gov/acr/acr.htm', '2026-03-12'),
('TX', 'general', false, NULL, true, 'Texas does not require a general contractor license at the state level', NULL, '2026-03-12'),

-- Florida
('FL', 'electrical', true, 'Certified Electrical Contractor', true, 'Homeowners may pull permits and perform electrical work on their own residence', 'https://www.myfloridalicense.com/intentions2.asp?chession=&catid=11', '2026-03-12'),
('FL', 'plumbing', true, 'Certified Plumbing Contractor', true, 'Homeowners may pull permits and perform plumbing work on their own residence', 'https://www.myfloridalicense.com/intentions2.asp?chession=&catid=11', '2026-03-12'),
('FL', 'hvac', true, 'Certified HVAC Contractor', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://www.myfloridalicense.com/intentions2.asp?chession=&catid=11', '2026-03-12'),
('FL', 'general', true, 'Certified General Contractor', true, 'Homeowners may act as their own contractor for their own residence with owner-builder disclosure', 'https://www.myfloridalicense.com/intentions2.asp?chession=&catid=11', '2026-03-12'),

-- New York
('NY', 'electrical', true, 'Licensed Electrician', true, 'Homeowner exemptions vary by municipality; NYC requires licensed electrician for all work', 'https://www.dos.ny.gov/licensing/', '2026-03-12'),
('NY', 'plumbing', true, 'Licensed Plumber', true, 'Homeowner exemptions vary by municipality; NYC requires licensed plumber for all work', 'https://www.dos.ny.gov/licensing/', '2026-03-12'),
('NY', 'hvac', true, 'HVAC Technician License', true, 'Homeowner exemptions vary by municipality; refrigerant requires EPA certification', 'https://www.dos.ny.gov/licensing/', '2026-03-12'),
('NY', 'general', false, NULL, true, 'New York does not require a general contractor license at the state level; local requirements vary', NULL, '2026-03-12'),

-- Pennsylvania
('PA', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own residence in most jurisdictions', 'https://www.pals.pa.gov/', '2026-03-12'),
('PA', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own residence in most jurisdictions', 'https://www.pals.pa.gov/', '2026-03-12'),
('PA', 'hvac', true, 'HVAC Contractor License', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://www.pals.pa.gov/', '2026-03-12'),
('PA', 'general', true, 'Home Improvement Contractor Registration', true, 'Homeowners are exempt when working on their own residence', 'https://www.attorneygeneral.gov/protect-yourself/home-improvement-contractor-registration/', '2026-03-12'),

-- Ohio
('OH', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own residence with proper permits', 'https://com.ohio.gov/divisions-and-programs/industrial-compliance/boards-and-commissions/ohio-board-of-building-standards', '2026-03-12'),
('OH', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own single-family residence', 'https://com.ohio.gov/divisions-and-programs/industrial-compliance/boards-and-commissions/ohio-construction-industry-licensing-board', '2026-03-12'),
('OH', 'hvac', true, 'HVAC Contractor License', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://com.ohio.gov/divisions-and-programs/industrial-compliance/boards-and-commissions/ohio-construction-industry-licensing-board', '2026-03-12'),
('OH', 'general', false, NULL, true, 'Ohio does not require a general contractor license at the state level', NULL, '2026-03-12'),

-- Illinois
('IL', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own residence; Chicago has separate licensing requirements', 'https://idfpr.illinois.gov/', '2026-03-12'),
('IL', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform minor plumbing work on their own residence; Chicago has separate licensing requirements', 'https://idfpr.illinois.gov/', '2026-03-12'),
('IL', 'hvac', true, 'HVAC Contractor License', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://idfpr.illinois.gov/', '2026-03-12'),
('IL', 'general', false, NULL, true, 'Illinois does not require a general contractor license at the state level; local requirements vary', NULL, '2026-03-12'),

-- Georgia
('GA', 'electrical', true, 'Licensed Electrical Contractor', true, 'Homeowners may perform electrical work on their own residence with proper permits', 'https://sos.ga.gov/georgia-professional-licensing-boards-702', '2026-03-12'),
('GA', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own residence with proper permits', 'https://sos.ga.gov/georgia-professional-licensing-boards-702', '2026-03-12'),
('GA', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://sos.ga.gov/georgia-professional-licensing-boards-702', '2026-03-12'),
('GA', 'general', true, 'General Contractor License', true, 'Homeowners are exempt when working on their own residence for projects under certain thresholds', 'https://sos.ga.gov/georgia-professional-licensing-boards-702', '2026-03-12'),

-- North Carolina
('NC', 'electrical', true, 'Licensed Electrician', true, 'Homeowners may perform electrical work on their own residence with proper permits', 'https://www.nclbgc.org/', '2026-03-12'),
('NC', 'plumbing', true, 'Licensed Plumber', true, 'Homeowners may perform plumbing work on their own residence with proper permits', 'https://www.ncsblpc.org/', '2026-03-12'),
('NC', 'hvac', true, 'Licensed HVAC Contractor', true, 'Homeowners may perform HVAC work on their own residence; refrigerant requires EPA certification', 'https://www.nclbgc.org/', '2026-03-12'),
('NC', 'general', true, 'General Contractor License', true, 'Homeowners are exempt when working on their own residence; license required for projects over $30,000 by contractors', 'https://www.nclbgc.org/', '2026-03-12');
