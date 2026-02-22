"""
MCP (Model Context Protocol) Service for medication lookup and drug interactions.

Uses a comprehensive Indian market medication database with LLM-powered search
and in-memory caching for fast dropdown suggestions.
"""

import httpx
import json
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# ── In-memory cache for medications (persists across requests) ──────────────
_medication_cache: List[Dict[str, Any]] = []
_llm_search_cache: Dict[str, List[Dict[str, Any]]] = {}


# ── Comprehensive Indian Market Medications Database ────────────────────────
# Covers commonly prescribed drugs available in the Indian pharmaceutical market
INDIAN_MEDICATIONS_DB: List[Dict[str, Any]] = [
    # ── Analgesics / Antipyretics ──
    {"id": "IN001", "name": "Paracetamol 500mg", "genericName": "Acetaminophen", "code": "N02BE01", "form": "Tablet", "strengths": ["500mg", "650mg"], "category": "Analgesic", "manufacturer": "Various"},
    {"id": "IN002", "name": "Paracetamol 650mg", "genericName": "Acetaminophen", "code": "N02BE01", "form": "Tablet", "strengths": ["650mg"], "category": "Analgesic", "manufacturer": "Various"},
    {"id": "IN003", "name": "Dolo 650", "genericName": "Paracetamol", "code": "N02BE01", "form": "Tablet", "strengths": ["650mg"], "category": "Analgesic", "manufacturer": "Micro Labs"},
    {"id": "IN004", "name": "Crocin Advance", "genericName": "Paracetamol", "code": "N02BE01", "form": "Tablet", "strengths": ["500mg"], "category": "Analgesic", "manufacturer": "GSK"},
    {"id": "IN005", "name": "Calpol", "genericName": "Paracetamol", "code": "N02BE01", "form": "Suspension", "strengths": ["120mg/5ml", "250mg/5ml"], "category": "Analgesic (Pediatric)", "manufacturer": "GSK"},

    # ── NSAIDs ──
    {"id": "IN006", "name": "Ibuprofen 400mg", "genericName": "Ibuprofen", "code": "M01AE01", "form": "Tablet", "strengths": ["200mg", "400mg", "600mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN007", "name": "Brufen 400", "genericName": "Ibuprofen", "code": "M01AE01", "form": "Tablet", "strengths": ["400mg"], "category": "NSAID", "manufacturer": "Abbott"},
    {"id": "IN008", "name": "Combiflam", "genericName": "Ibuprofen + Paracetamol", "code": "M01AE51", "form": "Tablet", "strengths": ["400mg+325mg"], "category": "NSAID + Analgesic", "manufacturer": "Sanofi"},
    {"id": "IN009", "name": "Diclofenac 50mg", "genericName": "Diclofenac Sodium", "code": "M01AB05", "form": "Tablet", "strengths": ["50mg", "100mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN010", "name": "Voveran SR 100", "genericName": "Diclofenac Sodium", "code": "M01AB05", "form": "SR Tablet", "strengths": ["100mg"], "category": "NSAID", "manufacturer": "Novartis"},
    {"id": "IN011", "name": "Aceclofenac 100mg", "genericName": "Aceclofenac", "code": "M01AB16", "form": "Tablet", "strengths": ["100mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN012", "name": "Zerodol SP", "genericName": "Aceclofenac + Paracetamol + Serratiopeptidase", "code": "M01AB16", "form": "Tablet", "strengths": ["100mg+325mg+15mg"], "category": "NSAID Combo", "manufacturer": "Ipca Labs"},
    {"id": "IN013", "name": "Nimesulide 100mg", "genericName": "Nimesulide", "code": "M01AX17", "form": "Tablet", "strengths": ["100mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN014", "name": "Naproxen 250mg", "genericName": "Naproxen", "code": "M01AE02", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN015", "name": "Piroxicam 20mg", "genericName": "Piroxicam", "code": "M01AC01", "form": "Capsule", "strengths": ["10mg", "20mg"], "category": "NSAID", "manufacturer": "Various"},
    {"id": "IN016", "name": "Etoricoxib 90mg", "genericName": "Etoricoxib", "code": "M01AH05", "form": "Tablet", "strengths": ["60mg", "90mg", "120mg"], "category": "COX-2 Inhibitor", "manufacturer": "Various"},

    # ── Antibiotics ──
    {"id": "IN017", "name": "Amoxicillin 500mg", "genericName": "Amoxicillin", "code": "J01CA04", "form": "Capsule", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Penicillin)", "manufacturer": "Various"},
    {"id": "IN018", "name": "Augmentin 625 Duo", "genericName": "Amoxicillin + Clavulanate", "code": "J01CR02", "form": "Tablet", "strengths": ["500mg+125mg"], "category": "Antibiotic (Penicillin)", "manufacturer": "GSK"},
    {"id": "IN019", "name": "Azithromycin 500mg", "genericName": "Azithromycin", "code": "J01FA10", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Macrolide)", "manufacturer": "Various"},
    {"id": "IN020", "name": "Azee 500", "genericName": "Azithromycin", "code": "J01FA10", "form": "Tablet", "strengths": ["500mg"], "category": "Antibiotic (Macrolide)", "manufacturer": "Cipla"},
    {"id": "IN021", "name": "Ciprofloxacin 500mg", "genericName": "Ciprofloxacin", "code": "J01MA02", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Fluoroquinolone)", "manufacturer": "Various"},
    {"id": "IN022", "name": "Ciplox 500", "genericName": "Ciprofloxacin", "code": "J01MA02", "form": "Tablet", "strengths": ["500mg"], "category": "Antibiotic (Fluoroquinolone)", "manufacturer": "Cipla"},
    {"id": "IN023", "name": "Ofloxacin 200mg", "genericName": "Ofloxacin", "code": "J01MA01", "form": "Tablet", "strengths": ["200mg", "400mg"], "category": "Antibiotic (Fluoroquinolone)", "manufacturer": "Various"},
    {"id": "IN024", "name": "Levofloxacin 500mg", "genericName": "Levofloxacin", "code": "J01MA12", "form": "Tablet", "strengths": ["250mg", "500mg", "750mg"], "category": "Antibiotic (Fluoroquinolone)", "manufacturer": "Various"},
    {"id": "IN025", "name": "Cefixime 200mg", "genericName": "Cefixime", "code": "J01DD08", "form": "Tablet", "strengths": ["100mg", "200mg"], "category": "Antibiotic (Cephalosporin)", "manufacturer": "Various"},
    {"id": "IN026", "name": "Cephalexin 500mg", "genericName": "Cephalexin", "code": "J01DB01", "form": "Capsule", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Cephalosporin)", "manufacturer": "Various"},
    {"id": "IN027", "name": "Ceftriaxone 1g Inj", "genericName": "Ceftriaxone", "code": "J01DD04", "form": "Injection", "strengths": ["250mg", "500mg", "1g"], "category": "Antibiotic (Cephalosporin)", "manufacturer": "Various"},
    {"id": "IN028", "name": "Doxycycline 100mg", "genericName": "Doxycycline", "code": "J01AA02", "form": "Capsule", "strengths": ["100mg"], "category": "Antibiotic (Tetracycline)", "manufacturer": "Various"},
    {"id": "IN029", "name": "Metronidazole 400mg", "genericName": "Metronidazole", "code": "J01XD01", "form": "Tablet", "strengths": ["200mg", "400mg"], "category": "Antibiotic (Nitroimidazole)", "manufacturer": "Various"},
    {"id": "IN030", "name": "Clindamycin 300mg", "genericName": "Clindamycin", "code": "J01FF01", "form": "Capsule", "strengths": ["150mg", "300mg"], "category": "Antibiotic (Lincosamide)", "manufacturer": "Various"},
    {"id": "IN031", "name": "Norfloxacin 400mg", "genericName": "Norfloxacin", "code": "J01MA06", "form": "Tablet", "strengths": ["400mg"], "category": "Antibiotic (Fluoroquinolone)", "manufacturer": "Various"},
    {"id": "IN032", "name": "Nitrofurantoin 100mg", "genericName": "Nitrofurantoin", "code": "J01XE01", "form": "Capsule", "strengths": ["50mg", "100mg"], "category": "Antibiotic (Urinary)", "manufacturer": "Various"},
    {"id": "IN033", "name": "Linezolid 600mg", "genericName": "Linezolid", "code": "J01XX08", "form": "Tablet", "strengths": ["600mg"], "category": "Antibiotic (Oxazolidinone)", "manufacturer": "Various"},
    {"id": "IN034", "name": "Meropenem 1g Inj", "genericName": "Meropenem", "code": "J01DH02", "form": "Injection", "strengths": ["500mg", "1g"], "category": "Antibiotic (Carbapenem)", "manufacturer": "Various"},
    {"id": "IN035", "name": "Piperacillin + Tazobactam 4.5g Inj", "genericName": "Piperacillin + Tazobactam", "code": "J01CR05", "form": "Injection", "strengths": ["4.5g"], "category": "Antibiotic (Penicillin Combo)", "manufacturer": "Various"},
    {"id": "IN036", "name": "Vancomycin 500mg Inj", "genericName": "Vancomycin", "code": "J01XA01", "form": "Injection", "strengths": ["500mg", "1g"], "category": "Antibiotic (Glycopeptide)", "manufacturer": "Various"},
    {"id": "IN037", "name": "Cotrimoxazole DS", "genericName": "Sulfamethoxazole + Trimethoprim", "code": "J01EE01", "form": "Tablet", "strengths": ["800mg+160mg"], "category": "Antibiotic (Sulfonamide)", "manufacturer": "Various"},
    {"id": "IN038", "name": "Erythromycin 500mg", "genericName": "Erythromycin", "code": "J01FA01", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Macrolide)", "manufacturer": "Various"},
    {"id": "IN039", "name": "Clarithromycin 500mg", "genericName": "Clarithromycin", "code": "J01FA09", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antibiotic (Macrolide)", "manufacturer": "Various"},

    # ── Antifungals ──
    {"id": "IN040", "name": "Fluconazole 150mg", "genericName": "Fluconazole", "code": "J02AC01", "form": "Tablet", "strengths": ["50mg", "150mg", "200mg"], "category": "Antifungal", "manufacturer": "Various"},
    {"id": "IN041", "name": "Itraconazole 100mg", "genericName": "Itraconazole", "code": "J02AC02", "form": "Capsule", "strengths": ["100mg", "200mg"], "category": "Antifungal", "manufacturer": "Various"},
    {"id": "IN042", "name": "Clotrimazole Cream", "genericName": "Clotrimazole", "code": "D01AC01", "form": "Cream", "strengths": ["1%"], "category": "Antifungal (Topical)", "manufacturer": "Various"},
    {"id": "IN043", "name": "Terbinafine 250mg", "genericName": "Terbinafine", "code": "D01BA02", "form": "Tablet", "strengths": ["250mg"], "category": "Antifungal", "manufacturer": "Various"},

    # ── Antacids / GI ──
    {"id": "IN044", "name": "Omeprazole 20mg", "genericName": "Omeprazole", "code": "A02BC01", "form": "Capsule", "strengths": ["20mg", "40mg"], "category": "PPI", "manufacturer": "Various"},
    {"id": "IN045", "name": "Pantoprazole 40mg", "genericName": "Pantoprazole", "code": "A02BC02", "form": "Tablet", "strengths": ["20mg", "40mg"], "category": "PPI", "manufacturer": "Various"},
    {"id": "IN046", "name": "Pan D", "genericName": "Pantoprazole + Domperidone", "code": "A02BC02", "form": "Capsule", "strengths": ["40mg+30mg"], "category": "PPI + Prokinetic", "manufacturer": "Alkem"},
    {"id": "IN047", "name": "Rabeprazole 20mg", "genericName": "Rabeprazole", "code": "A02BC04", "form": "Tablet", "strengths": ["10mg", "20mg"], "category": "PPI", "manufacturer": "Various"},
    {"id": "IN048", "name": "Esomeprazole 40mg", "genericName": "Esomeprazole", "code": "A02BC05", "form": "Tablet", "strengths": ["20mg", "40mg"], "category": "PPI", "manufacturer": "Various"},
    {"id": "IN049", "name": "Ranitidine 150mg", "genericName": "Ranitidine", "code": "A02BA02", "form": "Tablet", "strengths": ["150mg", "300mg"], "category": "H2 Blocker", "manufacturer": "Various"},
    {"id": "IN050", "name": "Famotidine 20mg", "genericName": "Famotidine", "code": "A02BA03", "form": "Tablet", "strengths": ["20mg", "40mg"], "category": "H2 Blocker", "manufacturer": "Various"},
    {"id": "IN051", "name": "Domperidone 10mg", "genericName": "Domperidone", "code": "A03FA03", "form": "Tablet", "strengths": ["10mg"], "category": "Prokinetic / Antiemetic", "manufacturer": "Various"},
    {"id": "IN052", "name": "Ondansetron 4mg", "genericName": "Ondansetron", "code": "A04AA01", "form": "Tablet", "strengths": ["4mg", "8mg"], "category": "Antiemetic", "manufacturer": "Various"},
    {"id": "IN053", "name": "Sucralfate 1g", "genericName": "Sucralfate", "code": "A02BX02", "form": "Suspension", "strengths": ["1g/10ml"], "category": "Mucosal Protectant", "manufacturer": "Various"},
    {"id": "IN054", "name": "Loperamide 2mg", "genericName": "Loperamide", "code": "A07DA03", "form": "Capsule", "strengths": ["2mg"], "category": "Antidiarrheal", "manufacturer": "Various"},
    {"id": "IN055", "name": "ORS Powder", "genericName": "Oral Rehydration Salts", "code": "A07CA", "form": "Powder", "strengths": ["Standard WHO"], "category": "Rehydration", "manufacturer": "Various"},
    {"id": "IN056", "name": "Lactulose Solution", "genericName": "Lactulose", "code": "A06AD11", "form": "Syrup", "strengths": ["10g/15ml"], "category": "Laxative", "manufacturer": "Various"},
    {"id": "IN057", "name": "Bisacodyl 5mg", "genericName": "Bisacodyl", "code": "A06AB02", "form": "Tablet", "strengths": ["5mg"], "category": "Laxative", "manufacturer": "Various"},
    {"id": "IN058", "name": "Metoclopramide 10mg", "genericName": "Metoclopramide", "code": "A03FA01", "form": "Tablet", "strengths": ["10mg"], "category": "Prokinetic / Antiemetic", "manufacturer": "Various"},

    # ── Antidiabetics ──
    {"id": "IN059", "name": "Metformin 500mg", "genericName": "Metformin Hydrochloride", "code": "A10BA02", "form": "Tablet", "strengths": ["500mg", "850mg", "1000mg"], "category": "Antidiabetic (Biguanide)", "manufacturer": "Various"},
    {"id": "IN060", "name": "Metformin SR 500mg", "genericName": "Metformin SR", "code": "A10BA02", "form": "SR Tablet", "strengths": ["500mg", "1000mg"], "category": "Antidiabetic", "manufacturer": "Various"},
    {"id": "IN061", "name": "Glimepiride 1mg", "genericName": "Glimepiride", "code": "A10BB12", "form": "Tablet", "strengths": ["1mg", "2mg", "3mg", "4mg"], "category": "Antidiabetic (Sulfonylurea)", "manufacturer": "Various"},
    {"id": "IN062", "name": "Glimepiride + Metformin", "genericName": "Glimepiride + Metformin", "code": "A10BD02", "form": "Tablet", "strengths": ["1mg+500mg", "2mg+500mg"], "category": "Antidiabetic Combo", "manufacturer": "Various"},
    {"id": "IN063", "name": "Gliclazide 80mg", "genericName": "Gliclazide", "code": "A10BB09", "form": "Tablet", "strengths": ["40mg", "80mg"], "category": "Antidiabetic (Sulfonylurea)", "manufacturer": "Various"},
    {"id": "IN064", "name": "Sitagliptin 100mg", "genericName": "Sitagliptin", "code": "A10BH01", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Antidiabetic (DPP-4 Inhibitor)", "manufacturer": "MSD"},
    {"id": "IN065", "name": "Vildagliptin 50mg", "genericName": "Vildagliptin", "code": "A10BH02", "form": "Tablet", "strengths": ["50mg"], "category": "Antidiabetic (DPP-4 Inhibitor)", "manufacturer": "Novartis"},
    {"id": "IN066", "name": "Teneligliptin 20mg", "genericName": "Teneligliptin", "code": "A10BH07", "form": "Tablet", "strengths": ["20mg"], "category": "Antidiabetic (DPP-4 Inhibitor)", "manufacturer": "Various"},
    {"id": "IN067", "name": "Empagliflozin 10mg", "genericName": "Empagliflozin", "code": "A10BK03", "form": "Tablet", "strengths": ["10mg", "25mg"], "category": "Antidiabetic (SGLT2 Inhibitor)", "manufacturer": "Boehringer"},
    {"id": "IN068", "name": "Dapagliflozin 10mg", "genericName": "Dapagliflozin", "code": "A10BK01", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Antidiabetic (SGLT2 Inhibitor)", "manufacturer": "AstraZeneca"},
    {"id": "IN069", "name": "Pioglitazone 15mg", "genericName": "Pioglitazone", "code": "A10BG03", "form": "Tablet", "strengths": ["15mg", "30mg"], "category": "Antidiabetic (Thiazolidinedione)", "manufacturer": "Various"},
    {"id": "IN070", "name": "Insulin Glargine (Lantus)", "genericName": "Insulin Glargine", "code": "A10AE04", "form": "Injection", "strengths": ["100IU/ml"], "category": "Insulin (Long-acting)", "manufacturer": "Sanofi"},
    {"id": "IN071", "name": "Insulin Regular (Actrapid)", "genericName": "Regular Insulin", "code": "A10AB01", "form": "Injection", "strengths": ["40IU/ml", "100IU/ml"], "category": "Insulin (Short-acting)", "manufacturer": "Novo Nordisk"},
    {"id": "IN072", "name": "Insulin Mixtard 30/70", "genericName": "Biphasic Isophane Insulin", "code": "A10AD01", "form": "Injection", "strengths": ["40IU/ml", "100IU/ml"], "category": "Insulin (Premixed)", "manufacturer": "Novo Nordisk"},
    {"id": "IN073", "name": "Voglibose 0.2mg", "genericName": "Voglibose", "code": "A10BF03", "form": "Tablet", "strengths": ["0.2mg", "0.3mg"], "category": "Antidiabetic (Alpha-glucosidase Inhibitor)", "manufacturer": "Various"},

    # ── Antihypertensives ──
    {"id": "IN074", "name": "Amlodipine 5mg", "genericName": "Amlodipine Besylate", "code": "C08CA01", "form": "Tablet", "strengths": ["2.5mg", "5mg", "10mg"], "category": "CCB", "manufacturer": "Various"},
    {"id": "IN075", "name": "Telmisartan 40mg", "genericName": "Telmisartan", "code": "C09CA07", "form": "Tablet", "strengths": ["20mg", "40mg", "80mg"], "category": "ARB", "manufacturer": "Various"},
    {"id": "IN076", "name": "Telmisartan + Amlodipine", "genericName": "Telmisartan + Amlodipine", "code": "C09DB04", "form": "Tablet", "strengths": ["40mg+5mg", "80mg+5mg"], "category": "ARB + CCB", "manufacturer": "Various"},
    {"id": "IN077", "name": "Losartan 50mg", "genericName": "Losartan Potassium", "code": "C09CA01", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "ARB", "manufacturer": "Various"},
    {"id": "IN078", "name": "Olmesartan 20mg", "genericName": "Olmesartan Medoxomil", "code": "C09CA08", "form": "Tablet", "strengths": ["20mg", "40mg"], "category": "ARB", "manufacturer": "Various"},
    {"id": "IN079", "name": "Ramipril 5mg", "genericName": "Ramipril", "code": "C09AA05", "form": "Capsule", "strengths": ["1.25mg", "2.5mg", "5mg", "10mg"], "category": "ACE Inhibitor", "manufacturer": "Various"},
    {"id": "IN080", "name": "Enalapril 5mg", "genericName": "Enalapril", "code": "C09AA02", "form": "Tablet", "strengths": ["2.5mg", "5mg", "10mg"], "category": "ACE Inhibitor", "manufacturer": "Various"},
    {"id": "IN081", "name": "Atenolol 50mg", "genericName": "Atenolol", "code": "C07AB03", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Beta Blocker", "manufacturer": "Various"},
    {"id": "IN082", "name": "Metoprolol 50mg", "genericName": "Metoprolol Succinate", "code": "C07AB02", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Beta Blocker", "manufacturer": "Various"},
    {"id": "IN083", "name": "Metoprolol XL 25mg", "genericName": "Metoprolol Succinate XL", "code": "C07AB02", "form": "XL Tablet", "strengths": ["25mg", "50mg"], "category": "Beta Blocker", "manufacturer": "Various"},
    {"id": "IN084", "name": "Propranolol 40mg", "genericName": "Propranolol", "code": "C07AA05", "form": "Tablet", "strengths": ["10mg", "20mg", "40mg"], "category": "Beta Blocker", "manufacturer": "Various"},
    {"id": "IN085", "name": "Nebivolol 5mg", "genericName": "Nebivolol", "code": "C07AB12", "form": "Tablet", "strengths": ["2.5mg", "5mg"], "category": "Beta Blocker", "manufacturer": "Various"},
    {"id": "IN086", "name": "Carvedilol 6.25mg", "genericName": "Carvedilol", "code": "C07AG02", "form": "Tablet", "strengths": ["3.125mg", "6.25mg", "12.5mg", "25mg"], "category": "Alpha+Beta Blocker", "manufacturer": "Various"},
    {"id": "IN087", "name": "Hydrochlorothiazide 12.5mg", "genericName": "Hydrochlorothiazide", "code": "C03AA03", "form": "Tablet", "strengths": ["12.5mg", "25mg"], "category": "Thiazide Diuretic", "manufacturer": "Various"},
    {"id": "IN088", "name": "Furosemide 40mg", "genericName": "Furosemide", "code": "C03CA01", "form": "Tablet", "strengths": ["20mg", "40mg"], "category": "Loop Diuretic", "manufacturer": "Various"},
    {"id": "IN089", "name": "Spironolactone 25mg", "genericName": "Spironolactone", "code": "C03DA01", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Potassium-Sparing Diuretic", "manufacturer": "Various"},
    {"id": "IN090", "name": "Torsemide 10mg", "genericName": "Torsemide", "code": "C03CA04", "form": "Tablet", "strengths": ["10mg", "20mg"], "category": "Loop Diuretic", "manufacturer": "Various"},
    {"id": "IN091", "name": "Prazosin 2.5mg", "genericName": "Prazosin", "code": "C02CA01", "form": "Tablet", "strengths": ["1mg", "2.5mg", "5mg"], "category": "Alpha Blocker", "manufacturer": "Various"},
    {"id": "IN092", "name": "Nifedipine 10mg", "genericName": "Nifedipine", "code": "C08CA05", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "CCB", "manufacturer": "Various"},
    {"id": "IN093", "name": "Diltiazem 30mg", "genericName": "Diltiazem", "code": "C08DB01", "form": "Tablet", "strengths": ["30mg", "60mg", "90mg"], "category": "CCB", "manufacturer": "Various"},
    {"id": "IN094", "name": "Cilnidipine 10mg", "genericName": "Cilnidipine", "code": "C08CA14", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "CCB", "manufacturer": "Various"},
    {"id": "IN095", "name": "Clonidine 0.1mg", "genericName": "Clonidine", "code": "C02AC01", "form": "Tablet", "strengths": ["0.1mg", "0.2mg"], "category": "Centrally Acting Antihypertensive", "manufacturer": "Various"},

    # ── Lipid Lowering ──
    {"id": "IN096", "name": "Atorvastatin 10mg", "genericName": "Atorvastatin Calcium", "code": "C10AA05", "form": "Tablet", "strengths": ["10mg", "20mg", "40mg", "80mg"], "category": "Statin", "manufacturer": "Various"},
    {"id": "IN097", "name": "Rosuvastatin 10mg", "genericName": "Rosuvastatin Calcium", "code": "C10AA07", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg", "40mg"], "category": "Statin", "manufacturer": "Various"},
    {"id": "IN098", "name": "Atorvastatin + Fenofibrate", "genericName": "Atorvastatin + Fenofibrate", "code": "C10BA", "form": "Tablet", "strengths": ["10mg+160mg"], "category": "Statin + Fibrate", "manufacturer": "Various"},
    {"id": "IN099", "name": "Fenofibrate 160mg", "genericName": "Fenofibrate", "code": "C10AB05", "form": "Tablet", "strengths": ["145mg", "160mg", "200mg"], "category": "Fibrate", "manufacturer": "Various"},
    {"id": "IN100", "name": "Ezetimibe 10mg", "genericName": "Ezetimibe", "code": "C10AX09", "form": "Tablet", "strengths": ["10mg"], "category": "Cholesterol Absorption Inhibitor", "manufacturer": "Various"},

    # ── Antiplatelet / Anticoagulant ──
    {"id": "IN101", "name": "Aspirin 75mg", "genericName": "Acetylsalicylic Acid", "code": "B01AC06", "form": "Tablet", "strengths": ["75mg", "150mg", "325mg"], "category": "Antiplatelet", "manufacturer": "Various"},
    {"id": "IN102", "name": "Ecosprin 75", "genericName": "Aspirin (Enteric Coated)", "code": "B01AC06", "form": "EC Tablet", "strengths": ["75mg", "150mg"], "category": "Antiplatelet", "manufacturer": "USV"},
    {"id": "IN103", "name": "Clopidogrel 75mg", "genericName": "Clopidogrel", "code": "B01AC04", "form": "Tablet", "strengths": ["75mg", "150mg"], "category": "Antiplatelet", "manufacturer": "Various"},
    {"id": "IN104", "name": "Ecosprin AV 75/20", "genericName": "Aspirin + Atorvastatin", "code": "B01AC06", "form": "Capsule", "strengths": ["75mg+20mg"], "category": "Antiplatelet + Statin", "manufacturer": "USV"},
    {"id": "IN105", "name": "Warfarin 5mg", "genericName": "Warfarin Sodium", "code": "B01AA03", "form": "Tablet", "strengths": ["1mg", "2mg", "5mg"], "category": "Anticoagulant", "manufacturer": "Various"},
    {"id": "IN106", "name": "Heparin 5000 IU Inj", "genericName": "Heparin Sodium", "code": "B01AB01", "form": "Injection", "strengths": ["5000IU/ml"], "category": "Anticoagulant", "manufacturer": "Various"},
    {"id": "IN107", "name": "Enoxaparin 40mg Inj", "genericName": "Enoxaparin Sodium", "code": "B01AB05", "form": "Injection", "strengths": ["20mg", "40mg", "60mg"], "category": "LMWH Anticoagulant", "manufacturer": "Various"},
    {"id": "IN108", "name": "Rivaroxaban 10mg", "genericName": "Rivaroxaban", "code": "B01AF01", "form": "Tablet", "strengths": ["10mg", "15mg", "20mg"], "category": "NOAC", "manufacturer": "Bayer"},
    {"id": "IN109", "name": "Apixaban 5mg", "genericName": "Apixaban", "code": "B01AF02", "form": "Tablet", "strengths": ["2.5mg", "5mg"], "category": "NOAC", "manufacturer": "BMS/Pfizer"},
    {"id": "IN110", "name": "Dabigatran 110mg", "genericName": "Dabigatran Etexilate", "code": "B01AE07", "form": "Capsule", "strengths": ["75mg", "110mg", "150mg"], "category": "NOAC", "manufacturer": "Boehringer"},
    {"id": "IN111", "name": "Ticagrelor 90mg", "genericName": "Ticagrelor", "code": "B01AC24", "form": "Tablet", "strengths": ["60mg", "90mg"], "category": "Antiplatelet", "manufacturer": "AstraZeneca"},
    {"id": "IN112", "name": "Prasugrel 10mg", "genericName": "Prasugrel", "code": "B01AC22", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Antiplatelet", "manufacturer": "Various"},

    # ── Respiratory ──
    {"id": "IN113", "name": "Salbutamol Inhaler", "genericName": "Salbutamol", "code": "R03AC02", "form": "Inhaler (MDI)", "strengths": ["100mcg/puff"], "category": "Bronchodilator (SABA)", "manufacturer": "Various"},
    {"id": "IN114", "name": "Salbutamol Nebulization", "genericName": "Salbutamol", "code": "R03AC02", "form": "Nebulization Solution", "strengths": ["2.5mg/2.5ml", "5mg/2.5ml"], "category": "Bronchodilator (SABA)", "manufacturer": "Various"},
    {"id": "IN115", "name": "Ipratropium Bromide Nebulization", "genericName": "Ipratropium Bromide", "code": "R03BB01", "form": "Nebulization Solution", "strengths": ["500mcg/2ml"], "category": "Anticholinergic Bronchodilator", "manufacturer": "Various"},
    {"id": "IN116", "name": "Budesonide Inhaler", "genericName": "Budesonide", "code": "R03BA02", "form": "Inhaler", "strengths": ["100mcg", "200mcg", "400mcg"], "category": "ICS", "manufacturer": "Various"},
    {"id": "IN117", "name": "Foracort Inhaler 200", "genericName": "Budesonide + Formoterol", "code": "R03AK07", "form": "Inhaler", "strengths": ["200mcg+6mcg", "400mcg+6mcg"], "category": "ICS + LABA", "manufacturer": "Cipla"},
    {"id": "IN118", "name": "Seroflo 250 Inhaler", "genericName": "Fluticasone + Salmeterol", "code": "R03AK06", "form": "Inhaler", "strengths": ["125mcg+25mcg", "250mcg+25mcg"], "category": "ICS + LABA", "manufacturer": "Cipla"},
    {"id": "IN119", "name": "Montelukast 10mg", "genericName": "Montelukast", "code": "R03DC03", "form": "Tablet", "strengths": ["4mg", "5mg", "10mg"], "category": "Leukotriene Antagonist", "manufacturer": "Various"},
    {"id": "IN120", "name": "Theophylline SR 300mg", "genericName": "Theophylline", "code": "R03DA04", "form": "SR Tablet", "strengths": ["200mg", "300mg", "400mg"], "category": "Xanthine Bronchodilator", "manufacturer": "Various"},
    {"id": "IN121", "name": "Tiotropium Inhaler", "genericName": "Tiotropium Bromide", "code": "R03BB04", "form": "Inhaler", "strengths": ["9mcg/puff"], "category": "LAMA", "manufacturer": "Boehringer"},
    {"id": "IN122", "name": "Deriphyllin Retard 150", "genericName": "Etofylline + Theophylline", "code": "R03DA", "form": "Tablet", "strengths": ["150mg"], "category": "Xanthine Bronchodilator", "manufacturer": "Various"},
    {"id": "IN123", "name": "Codeine Phosphate 10mg", "genericName": "Codeine", "code": "R05DA04", "form": "Tablet", "strengths": ["10mg", "15mg", "30mg"], "category": "Antitussive (Opioid)", "manufacturer": "Various"},
    {"id": "IN124", "name": "Dextromethorphan Syrup", "genericName": "Dextromethorphan", "code": "R05DA09", "form": "Syrup", "strengths": ["10mg/5ml", "15mg/5ml"], "category": "Antitussive", "manufacturer": "Various"},
    {"id": "IN125", "name": "Ambroxol 30mg", "genericName": "Ambroxol Hydrochloride", "code": "R05CB06", "form": "Tablet", "strengths": ["30mg"], "category": "Mucolytic", "manufacturer": "Various"},
    {"id": "IN126", "name": "Acetylcysteine 600mg", "genericName": "N-Acetylcysteine", "code": "R05CB01", "form": "Tablet", "strengths": ["200mg", "600mg"], "category": "Mucolytic", "manufacturer": "Various"},

    # ── Antihistamines / Allergy ──
    {"id": "IN127", "name": "Cetirizine 10mg", "genericName": "Cetirizine", "code": "R06AE07", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Antihistamine", "manufacturer": "Various"},
    {"id": "IN128", "name": "Levocetirizine 5mg", "genericName": "Levocetirizine", "code": "R06AE09", "form": "Tablet", "strengths": ["5mg"], "category": "Antihistamine", "manufacturer": "Various"},
    {"id": "IN129", "name": "Fexofenadine 120mg", "genericName": "Fexofenadine", "code": "R06AX26", "form": "Tablet", "strengths": ["60mg", "120mg", "180mg"], "category": "Antihistamine", "manufacturer": "Various"},
    {"id": "IN130", "name": "Chlorpheniramine 4mg", "genericName": "Chlorpheniramine Maleate", "code": "R06AB04", "form": "Tablet", "strengths": ["4mg"], "category": "Antihistamine (Sedating)", "manufacturer": "Various"},
    {"id": "IN131", "name": "Hydroxyzine 25mg", "genericName": "Hydroxyzine", "code": "N05BB01", "form": "Tablet", "strengths": ["10mg", "25mg"], "category": "Antihistamine (Sedating)", "manufacturer": "Various"},
    {"id": "IN132", "name": "Montelukast + Levocetirizine", "genericName": "Montelukast + Levocetirizine", "code": "R03DC03", "form": "Tablet", "strengths": ["10mg+5mg"], "category": "Anti-allergy Combo", "manufacturer": "Various"},
    {"id": "IN133", "name": "Bilastine 20mg", "genericName": "Bilastine", "code": "R06AX29", "form": "Tablet", "strengths": ["20mg"], "category": "Antihistamine", "manufacturer": "Various"},

    # ── Corticosteroids ──
    {"id": "IN134", "name": "Prednisolone 5mg", "genericName": "Prednisolone", "code": "H02AB06", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg", "40mg"], "category": "Corticosteroid", "manufacturer": "Various"},
    {"id": "IN135", "name": "Methylprednisolone 4mg", "genericName": "Methylprednisolone", "code": "H02AB04", "form": "Tablet", "strengths": ["4mg", "8mg", "16mg"], "category": "Corticosteroid", "manufacturer": "Various"},
    {"id": "IN136", "name": "Dexamethasone 0.5mg", "genericName": "Dexamethasone", "code": "H02AB02", "form": "Tablet", "strengths": ["0.5mg", "4mg"], "category": "Corticosteroid", "manufacturer": "Various"},
    {"id": "IN137", "name": "Hydrocortisone 100mg Inj", "genericName": "Hydrocortisone", "code": "H02AB09", "form": "Injection", "strengths": ["100mg"], "category": "Corticosteroid", "manufacturer": "Various"},
    {"id": "IN138", "name": "Deflazacort 6mg", "genericName": "Deflazacort", "code": "H02AB13", "form": "Tablet", "strengths": ["6mg", "12mg", "30mg"], "category": "Corticosteroid", "manufacturer": "Various"},
    {"id": "IN139", "name": "Budesonide Nebulization", "genericName": "Budesonide", "code": "R03BA02", "form": "Nebulization Solution", "strengths": ["0.5mg/2ml", "1mg/2ml"], "category": "ICS (Nebulization)", "manufacturer": "Various"},

    # ── Cardiac / Anti-anginal ──
    {"id": "IN140", "name": "Nitroglycerin SL 0.5mg", "genericName": "Glyceryl Trinitrate", "code": "C01DA02", "form": "Sublingual Tablet", "strengths": ["0.5mg"], "category": "Nitrate", "manufacturer": "Various"},
    {"id": "IN141", "name": "Isosorbide Dinitrate 5mg", "genericName": "Isosorbide Dinitrate", "code": "C01DA08", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Nitrate", "manufacturer": "Various"},
    {"id": "IN142", "name": "Isosorbide Mononitrate 20mg", "genericName": "Isosorbide Mononitrate", "code": "C01DA14", "form": "Tablet", "strengths": ["10mg", "20mg", "30mg", "60mg"], "category": "Nitrate", "manufacturer": "Various"},
    {"id": "IN143", "name": "Digoxin 0.25mg", "genericName": "Digoxin", "code": "C01AA05", "form": "Tablet", "strengths": ["0.125mg", "0.25mg"], "category": "Cardiac Glycoside", "manufacturer": "Various"},
    {"id": "IN144", "name": "Amiodarone 200mg", "genericName": "Amiodarone", "code": "C01BD01", "form": "Tablet", "strengths": ["100mg", "200mg"], "category": "Antiarrhythmic", "manufacturer": "Various"},
    {"id": "IN145", "name": "Ivabradine 5mg", "genericName": "Ivabradine", "code": "C01EB17", "form": "Tablet", "strengths": ["5mg", "7.5mg"], "category": "If Channel Inhibitor", "manufacturer": "Various"},
    {"id": "IN146", "name": "Trimetazidine 35mg MR", "genericName": "Trimetazidine", "code": "C01EB15", "form": "MR Tablet", "strengths": ["35mg"], "category": "Anti-anginal", "manufacturer": "Various"},
    {"id": "IN147", "name": "Ranolazine 500mg", "genericName": "Ranolazine", "code": "C01EB18", "form": "ER Tablet", "strengths": ["500mg", "1000mg"], "category": "Anti-anginal", "manufacturer": "Various"},
    {"id": "IN148", "name": "Sacubitril + Valsartan", "genericName": "Sacubitril + Valsartan", "code": "C09DX04", "form": "Tablet", "strengths": ["50mg", "100mg", "200mg"], "category": "ARNI (Heart Failure)", "manufacturer": "Novartis"},

    # ── Thyroid ──
    {"id": "IN149", "name": "Thyroxine 50mcg", "genericName": "Levothyroxine Sodium", "code": "H03AA01", "form": "Tablet", "strengths": ["12.5mcg", "25mcg", "50mcg", "75mcg", "100mcg", "125mcg", "150mcg"], "category": "Thyroid Hormone", "manufacturer": "Various"},
    {"id": "IN150", "name": "Carbimazole 5mg", "genericName": "Carbimazole", "code": "H03BB01", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "Antithyroid", "manufacturer": "Various"},
    {"id": "IN151", "name": "Propylthiouracil 50mg", "genericName": "Propylthiouracil", "code": "H03BA02", "form": "Tablet", "strengths": ["50mg"], "category": "Antithyroid", "manufacturer": "Various"},

    # ── Neuropsychiatry ──
    {"id": "IN152", "name": "Escitalopram 10mg", "genericName": "Escitalopram Oxalate", "code": "N06AB10", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "SSRI Antidepressant", "manufacturer": "Various"},
    {"id": "IN153", "name": "Sertraline 50mg", "genericName": "Sertraline", "code": "N06AB06", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "SSRI Antidepressant", "manufacturer": "Various"},
    {"id": "IN154", "name": "Fluoxetine 20mg", "genericName": "Fluoxetine", "code": "N06AB03", "form": "Capsule", "strengths": ["10mg", "20mg", "40mg"], "category": "SSRI Antidepressant", "manufacturer": "Various"},
    {"id": "IN155", "name": "Amitriptyline 25mg", "genericName": "Amitriptyline", "code": "N06AA09", "form": "Tablet", "strengths": ["10mg", "25mg", "75mg"], "category": "TCA Antidepressant", "manufacturer": "Various"},
    {"id": "IN156", "name": "Venlafaxine XR 75mg", "genericName": "Venlafaxine", "code": "N06AX16", "form": "XR Capsule", "strengths": ["37.5mg", "75mg", "150mg"], "category": "SNRI Antidepressant", "manufacturer": "Various"},
    {"id": "IN157", "name": "Duloxetine 20mg", "genericName": "Duloxetine", "code": "N06AX21", "form": "Capsule", "strengths": ["20mg", "30mg", "60mg"], "category": "SNRI Antidepressant", "manufacturer": "Various"},
    {"id": "IN158", "name": "Mirtazapine 15mg", "genericName": "Mirtazapine", "code": "N06AX11", "form": "Tablet", "strengths": ["7.5mg", "15mg", "30mg"], "category": "NaSSA Antidepressant", "manufacturer": "Various"},
    {"id": "IN159", "name": "Olanzapine 5mg", "genericName": "Olanzapine", "code": "N05AH03", "form": "Tablet", "strengths": ["2.5mg", "5mg", "10mg"], "category": "Atypical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN160", "name": "Risperidone 2mg", "genericName": "Risperidone", "code": "N05AX08", "form": "Tablet", "strengths": ["1mg", "2mg", "3mg", "4mg"], "category": "Atypical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN161", "name": "Quetiapine 25mg", "genericName": "Quetiapine", "code": "N05AH04", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg", "200mg"], "category": "Atypical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN162", "name": "Aripiprazole 10mg", "genericName": "Aripiprazole", "code": "N05AX12", "form": "Tablet", "strengths": ["5mg", "10mg", "15mg", "20mg"], "category": "Atypical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN163", "name": "Haloperidol 5mg", "genericName": "Haloperidol", "code": "N05AD01", "form": "Tablet", "strengths": ["1.5mg", "5mg", "10mg"], "category": "Typical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN164", "name": "Clozapine 100mg", "genericName": "Clozapine", "code": "N05AH02", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Atypical Antipsychotic", "manufacturer": "Various"},
    {"id": "IN165", "name": "Lithium Carbonate 300mg", "genericName": "Lithium Carbonate", "code": "N05AN01", "form": "Tablet", "strengths": ["300mg"], "category": "Mood Stabilizer", "manufacturer": "Various"},
    {"id": "IN166", "name": "Sodium Valproate 200mg", "genericName": "Sodium Valproate", "code": "N03AG01", "form": "Tablet", "strengths": ["200mg", "300mg", "500mg"], "category": "Anticonvulsant / Mood Stabilizer", "manufacturer": "Various"},
    {"id": "IN167", "name": "Carbamazepine 200mg", "genericName": "Carbamazepine", "code": "N03AF01", "form": "Tablet", "strengths": ["100mg", "200mg", "400mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN168", "name": "Oxcarbazepine 300mg", "genericName": "Oxcarbazepine", "code": "N03AF02", "form": "Tablet", "strengths": ["150mg", "300mg", "600mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN169", "name": "Phenytoin 100mg", "genericName": "Phenytoin Sodium", "code": "N03AB02", "form": "Tablet", "strengths": ["50mg", "100mg", "300mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN170", "name": "Levetiracetam 500mg", "genericName": "Levetiracetam", "code": "N03AX14", "form": "Tablet", "strengths": ["250mg", "500mg", "750mg", "1000mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN171", "name": "Gabapentin 300mg", "genericName": "Gabapentin", "code": "N03AX12", "form": "Capsule", "strengths": ["100mg", "300mg", "400mg"], "category": "Anticonvulsant / Neuropathic Pain", "manufacturer": "Various"},
    {"id": "IN172", "name": "Pregabalin 75mg", "genericName": "Pregabalin", "code": "N03AX16", "form": "Capsule", "strengths": ["75mg", "150mg", "300mg"], "category": "Anticonvulsant / Neuropathic Pain", "manufacturer": "Various"},
    {"id": "IN173", "name": "Lamotrigine 25mg", "genericName": "Lamotrigine", "code": "N03AX09", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg", "200mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN174", "name": "Topiramate 25mg", "genericName": "Topiramate", "code": "N03AX11", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg", "200mg"], "category": "Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN175", "name": "Clonazepam 0.5mg", "genericName": "Clonazepam", "code": "N03AE01", "form": "Tablet", "strengths": ["0.25mg", "0.5mg", "1mg", "2mg"], "category": "Benzodiazepine (Anticonvulsant)", "manufacturer": "Various"},
    {"id": "IN176", "name": "Clobazam 10mg", "genericName": "Clobazam", "code": "N05BA09", "form": "Tablet", "strengths": ["5mg", "10mg", "20mg"], "category": "Benzodiazepine", "manufacturer": "Various"},
    {"id": "IN177", "name": "Lorazepam 1mg", "genericName": "Lorazepam", "code": "N05BA06", "form": "Tablet", "strengths": ["0.5mg", "1mg", "2mg"], "category": "Benzodiazepine (Anxiolytic)", "manufacturer": "Various"},
    {"id": "IN178", "name": "Alprazolam 0.25mg", "genericName": "Alprazolam", "code": "N05BA12", "form": "Tablet", "strengths": ["0.25mg", "0.5mg", "1mg"], "category": "Benzodiazepine (Anxiolytic)", "manufacturer": "Various"},
    {"id": "IN179", "name": "Diazepam 5mg", "genericName": "Diazepam", "code": "N05BA01", "form": "Tablet", "strengths": ["2mg", "5mg", "10mg"], "category": "Benzodiazepine", "manufacturer": "Various"},
    {"id": "IN180", "name": "Midazolam 5mg Inj", "genericName": "Midazolam", "code": "N05CD08", "form": "Injection", "strengths": ["5mg/ml"], "category": "Benzodiazepine (Sedative)", "manufacturer": "Various"},
    {"id": "IN181", "name": "Zolpidem 10mg", "genericName": "Zolpidem", "code": "N05CF02", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Sedative/Hypnotic", "manufacturer": "Various"},
    {"id": "IN182", "name": "Donepezil 5mg", "genericName": "Donepezil", "code": "N06DA02", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Anti-Alzheimer (AChE Inhibitor)", "manufacturer": "Various"},
    {"id": "IN183", "name": "Memantine 10mg", "genericName": "Memantine", "code": "N06DX01", "form": "Tablet", "strengths": ["5mg", "10mg"], "category": "Anti-Alzheimer (NMDA Antagonist)", "manufacturer": "Various"},
    {"id": "IN184", "name": "Levodopa + Carbidopa", "genericName": "Levodopa + Carbidopa", "code": "N04BA02", "form": "Tablet", "strengths": ["100mg+25mg", "250mg+25mg"], "category": "Anti-Parkinson", "manufacturer": "Various"},
    {"id": "IN185", "name": "Trihexyphenidyl 2mg", "genericName": "Trihexyphenidyl", "code": "N04AA01", "form": "Tablet", "strengths": ["2mg"], "category": "Anticholinergic (Anti-Parkinson)", "manufacturer": "Various"},
    {"id": "IN186", "name": "Baclofen 10mg", "genericName": "Baclofen", "code": "M03BX01", "form": "Tablet", "strengths": ["10mg", "25mg"], "category": "Muscle Relaxant", "manufacturer": "Various"},
    {"id": "IN187", "name": "Tizanidine 2mg", "genericName": "Tizanidine", "code": "M03BX02", "form": "Tablet", "strengths": ["2mg", "4mg"], "category": "Muscle Relaxant", "manufacturer": "Various"},
    {"id": "IN188", "name": "Sumatriptan 50mg", "genericName": "Sumatriptan", "code": "N02CC01", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "Triptan (Migraine)", "manufacturer": "Various"},
    {"id": "IN189", "name": "Flunarizine 10mg", "genericName": "Flunarizine", "code": "N07CA03", "form": "Capsule", "strengths": ["5mg", "10mg"], "category": "Migraine Prophylaxis", "manufacturer": "Various"},

    # ── Vitamins / Supplements ──
    {"id": "IN190", "name": "Vitamin D3 60000 IU", "genericName": "Cholecalciferol", "code": "A11CC05", "form": "Sachet/Capsule", "strengths": ["1000IU", "60000IU"], "category": "Vitamin D Supplement", "manufacturer": "Various"},
    {"id": "IN191", "name": "Calcium + Vitamin D3", "genericName": "Calcium Carbonate + Cholecalciferol", "code": "A12AX", "form": "Tablet", "strengths": ["500mg+250IU"], "category": "Calcium Supplement", "manufacturer": "Various"},
    {"id": "IN192", "name": "Iron + Folic Acid", "genericName": "Ferrous Fumarate + Folic Acid", "code": "B03AD", "form": "Tablet", "strengths": ["100mg+1.5mg"], "category": "Iron Supplement", "manufacturer": "Various"},
    {"id": "IN193", "name": "B-Complex Forte", "genericName": "Vitamin B Complex", "code": "A11EA", "form": "Tablet", "strengths": ["Standard"], "category": "Vitamin B Supplement", "manufacturer": "Various"},
    {"id": "IN194", "name": "Methylcobalamin 1500mcg", "genericName": "Methylcobalamin", "code": "B03BA05", "form": "Tablet", "strengths": ["500mcg", "1500mcg"], "category": "Vitamin B12", "manufacturer": "Various"},
    {"id": "IN195", "name": "Vitamin C 500mg", "genericName": "Ascorbic Acid", "code": "A11GA01", "form": "Tablet", "strengths": ["500mg"], "category": "Vitamin C Supplement", "manufacturer": "Various"},
    {"id": "IN196", "name": "Zinc 50mg", "genericName": "Zinc Sulphate", "code": "A12CB01", "form": "Tablet", "strengths": ["20mg", "50mg"], "category": "Zinc Supplement", "manufacturer": "Various"},
    {"id": "IN197", "name": "Folic Acid 5mg", "genericName": "Folic Acid", "code": "B03BB01", "form": "Tablet", "strengths": ["5mg"], "category": "Vitamin Supplement", "manufacturer": "Various"},

    # ── Antimalarials ──
    {"id": "IN198", "name": "Chloroquine 250mg", "genericName": "Chloroquine Phosphate", "code": "P01BA01", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antimalarial", "manufacturer": "Various"},
    {"id": "IN199", "name": "Hydroxychloroquine 200mg", "genericName": "Hydroxychloroquine", "code": "P01BA02", "form": "Tablet", "strengths": ["200mg", "300mg"], "category": "Antimalarial / DMARD", "manufacturer": "Various"},
    {"id": "IN200", "name": "Artemether + Lumefantrine", "genericName": "Artemether + Lumefantrine", "code": "P01BF01", "form": "Tablet", "strengths": ["20mg+120mg", "80mg+480mg"], "category": "Antimalarial (ACT)", "manufacturer": "Various"},

    # ── Antiparasitics ──
    {"id": "IN201", "name": "Albendazole 400mg", "genericName": "Albendazole", "code": "P02CA03", "form": "Tablet", "strengths": ["200mg", "400mg"], "category": "Anthelmintic", "manufacturer": "Various"},
    {"id": "IN202", "name": "Ivermectin 12mg", "genericName": "Ivermectin", "code": "P02CF01", "form": "Tablet", "strengths": ["3mg", "6mg", "12mg"], "category": "Antiparasitic", "manufacturer": "Various"},
    {"id": "IN203", "name": "Mebendazole 100mg", "genericName": "Mebendazole", "code": "P02CA01", "form": "Tablet", "strengths": ["100mg"], "category": "Anthelmintic", "manufacturer": "Various"},

    # ── Antivirals ──
    {"id": "IN204", "name": "Acyclovir 400mg", "genericName": "Acyclovir", "code": "J05AB01", "form": "Tablet", "strengths": ["200mg", "400mg", "800mg"], "category": "Antiviral", "manufacturer": "Various"},
    {"id": "IN205", "name": "Oseltamivir 75mg", "genericName": "Oseltamivir", "code": "J05AH02", "form": "Capsule", "strengths": ["30mg", "45mg", "75mg"], "category": "Antiviral (Influenza)", "manufacturer": "Various"},
    {"id": "IN206", "name": "Valacyclovir 500mg", "genericName": "Valacyclovir", "code": "J05AB11", "form": "Tablet", "strengths": ["500mg", "1000mg"], "category": "Antiviral", "manufacturer": "Various"},

    # ── Emergency / Critical Care ──
    {"id": "IN207", "name": "Adrenaline 1mg Inj", "genericName": "Epinephrine", "code": "C01CA24", "form": "Injection", "strengths": ["1mg/ml"], "category": "Vasopressor", "manufacturer": "Various"},
    {"id": "IN208", "name": "Atropine 0.6mg Inj", "genericName": "Atropine Sulphate", "code": "A03BA01", "form": "Injection", "strengths": ["0.6mg/ml"], "category": "Anticholinergic", "manufacturer": "Various"},
    {"id": "IN209", "name": "Dopamine 200mg Inj", "genericName": "Dopamine Hydrochloride", "code": "C01CA04", "form": "Injection", "strengths": ["200mg/5ml"], "category": "Vasopressor", "manufacturer": "Various"},
    {"id": "IN210", "name": "Noradrenaline 2mg Inj", "genericName": "Norepinephrine", "code": "C01CA03", "form": "Injection", "strengths": ["2mg/ml", "4mg/4ml"], "category": "Vasopressor", "manufacturer": "Various"},
    {"id": "IN211", "name": "Dobutamine 250mg Inj", "genericName": "Dobutamine", "code": "C01CA07", "form": "Injection", "strengths": ["250mg/20ml"], "category": "Inotrope", "manufacturer": "Various"},
    {"id": "IN212", "name": "Magnesium Sulphate 2g Inj", "genericName": "Magnesium Sulphate", "code": "B05XA05", "form": "Injection", "strengths": ["1g/2ml", "2g/10ml"], "category": "Electrolyte / Anticonvulsant", "manufacturer": "Various"},
    {"id": "IN213", "name": "Calcium Gluconate 10% Inj", "genericName": "Calcium Gluconate", "code": "A12AA03", "form": "Injection", "strengths": ["10%"], "category": "Electrolyte", "manufacturer": "Various"},
    {"id": "IN214", "name": "Sodium Bicarbonate 7.5% Inj", "genericName": "Sodium Bicarbonate", "code": "B05CB04", "form": "Injection", "strengths": ["7.5%"], "category": "Alkalinizing Agent", "manufacturer": "Various"},
    {"id": "IN215", "name": "Naloxone 0.4mg Inj", "genericName": "Naloxone", "code": "V03AB15", "form": "Injection", "strengths": ["0.4mg/ml"], "category": "Opioid Antagonist", "manufacturer": "Various"},
    {"id": "IN216", "name": "Mannitol 20% IV", "genericName": "Mannitol", "code": "B05BC01", "form": "IV Infusion", "strengths": ["20%"], "category": "Osmotic Diuretic", "manufacturer": "Various"},
    {"id": "IN217", "name": "Normal Saline 0.9% IV", "genericName": "Sodium Chloride", "code": "B05BB01", "form": "IV Fluid", "strengths": ["0.9%"], "category": "IV Fluid", "manufacturer": "Various"},
    {"id": "IN218", "name": "Ringer Lactate IV", "genericName": "Ringer Lactate", "code": "B05BB01", "form": "IV Fluid", "strengths": ["Standard"], "category": "IV Fluid", "manufacturer": "Various"},
    {"id": "IN219", "name": "Dextrose 5% IV", "genericName": "Dextrose", "code": "B05BA03", "form": "IV Fluid", "strengths": ["5%", "10%", "25%"], "category": "IV Fluid", "manufacturer": "Various"},
    {"id": "IN220", "name": "Potassium Chloride Inj", "genericName": "Potassium Chloride", "code": "B05XA01", "form": "Injection", "strengths": ["15%"], "category": "Electrolyte", "manufacturer": "Various"},

    # ── Pain / Opioids ──
    {"id": "IN221", "name": "Tramadol 50mg", "genericName": "Tramadol Hydrochloride", "code": "N02AX02", "form": "Capsule", "strengths": ["50mg", "100mg"], "category": "Opioid Analgesic", "manufacturer": "Various"},
    {"id": "IN222", "name": "Morphine 10mg Inj", "genericName": "Morphine Sulphate", "code": "N02AA01", "form": "Injection", "strengths": ["10mg/ml", "15mg/ml"], "category": "Opioid Analgesic", "manufacturer": "Various"},
    {"id": "IN223", "name": "Fentanyl 100mcg Patch", "genericName": "Fentanyl", "code": "N02AB03", "form": "Transdermal Patch", "strengths": ["25mcg/hr", "50mcg/hr", "100mcg/hr"], "category": "Opioid Analgesic", "manufacturer": "Various"},
    {"id": "IN224", "name": "Pentazocine 30mg Inj", "genericName": "Pentazocine", "code": "N02AD01", "form": "Injection", "strengths": ["30mg/ml"], "category": "Opioid Analgesic", "manufacturer": "Various"},
    {"id": "IN225", "name": "Buprenorphine 0.3mg Inj", "genericName": "Buprenorphine", "code": "N02AE01", "form": "Injection", "strengths": ["0.3mg/ml"], "category": "Opioid Analgesic", "manufacturer": "Various"},

    # ── Ophthalmology ──
    {"id": "IN226", "name": "Timolol 0.5% Eye Drops", "genericName": "Timolol", "code": "S01ED01", "form": "Eye Drops", "strengths": ["0.25%", "0.5%"], "category": "Antiglaucoma (Beta Blocker)", "manufacturer": "Various"},
    {"id": "IN227", "name": "Ciprofloxacin 0.3% Eye Drops", "genericName": "Ciprofloxacin", "code": "S01AE03", "form": "Eye Drops", "strengths": ["0.3%"], "category": "Ophthalmic Antibiotic", "manufacturer": "Various"},
    {"id": "IN228", "name": "Moxifloxacin 0.5% Eye Drops", "genericName": "Moxifloxacin", "code": "S01AE07", "form": "Eye Drops", "strengths": ["0.5%"], "category": "Ophthalmic Antibiotic", "manufacturer": "Various"},
    {"id": "IN229", "name": "Prednisolone 1% Eye Drops", "genericName": "Prednisolone Acetate", "code": "S01BA04", "form": "Eye Drops", "strengths": ["0.12%", "1%"], "category": "Ophthalmic Steroid", "manufacturer": "Various"},

    # ── Dermatology ──
    {"id": "IN230", "name": "Betamethasone Cream", "genericName": "Betamethasone Valerate", "code": "D07AC01", "form": "Cream", "strengths": ["0.1%"], "category": "Topical Steroid", "manufacturer": "Various"},
    {"id": "IN231", "name": "Clobetasol Propionate Cream", "genericName": "Clobetasol", "code": "D07AD01", "form": "Cream", "strengths": ["0.05%"], "category": "Topical Steroid (Super Potent)", "manufacturer": "Various"},
    {"id": "IN232", "name": "Mupirocin 2% Ointment", "genericName": "Mupirocin", "code": "D06AX09", "form": "Ointment", "strengths": ["2%"], "category": "Topical Antibiotic", "manufacturer": "Various"},
    {"id": "IN233", "name": "Fusidic Acid 2% Cream", "genericName": "Fusidic Acid", "code": "D06AX01", "form": "Cream", "strengths": ["2%"], "category": "Topical Antibiotic", "manufacturer": "Various"},
    {"id": "IN234", "name": "Permethrin 5% Cream", "genericName": "Permethrin", "code": "P03AC04", "form": "Cream", "strengths": ["5%"], "category": "Scabicide", "manufacturer": "Various"},
    {"id": "IN235", "name": "Silver Sulfadiazine 1% Cream", "genericName": "Silver Sulfadiazine", "code": "D06BA01", "form": "Cream", "strengths": ["1%"], "category": "Topical Antimicrobial (Burns)", "manufacturer": "Various"},
    {"id": "IN236", "name": "Calamine Lotion", "genericName": "Calamine", "code": "D02AB", "form": "Lotion", "strengths": ["Standard"], "category": "Skin Protectant", "manufacturer": "Various"},

    # ── Urology ──
    {"id": "IN237", "name": "Tamsulosin 0.4mg", "genericName": "Tamsulosin", "code": "G04CA02", "form": "Capsule", "strengths": ["0.2mg", "0.4mg"], "category": "Alpha-1 Blocker (BPH)", "manufacturer": "Various"},
    {"id": "IN238", "name": "Finasteride 5mg", "genericName": "Finasteride", "code": "G04CB01", "form": "Tablet", "strengths": ["1mg", "5mg"], "category": "5-alpha Reductase Inhibitor", "manufacturer": "Various"},
    {"id": "IN239", "name": "Dutasteride 0.5mg", "genericName": "Dutasteride", "code": "G04CB02", "form": "Capsule", "strengths": ["0.5mg"], "category": "5-alpha Reductase Inhibitor", "manufacturer": "Various"},
    {"id": "IN240", "name": "Sildenafil 50mg", "genericName": "Sildenafil", "code": "G04BE03", "form": "Tablet", "strengths": ["25mg", "50mg", "100mg"], "category": "PDE5 Inhibitor", "manufacturer": "Various"},

    # ── Obstetrics / Gynecology ──
    {"id": "IN241", "name": "Oxytocin 5 IU Inj", "genericName": "Oxytocin", "code": "H01BB02", "form": "Injection", "strengths": ["5IU/ml", "10IU/ml"], "category": "Uterotonic", "manufacturer": "Various"},
    {"id": "IN242", "name": "Misoprostol 200mcg", "genericName": "Misoprostol", "code": "A02BB01", "form": "Tablet", "strengths": ["200mcg"], "category": "Prostaglandin (Uterotonic)", "manufacturer": "Various"},
    {"id": "IN243", "name": "Tranexamic Acid 500mg", "genericName": "Tranexamic Acid", "code": "B02AA02", "form": "Tablet", "strengths": ["250mg", "500mg"], "category": "Antifibrinolytic", "manufacturer": "Various"},
    {"id": "IN244", "name": "Mifepristone 200mg", "genericName": "Mifepristone", "code": "G03XB01", "form": "Tablet", "strengths": ["200mg"], "category": "Antiprogestogen", "manufacturer": "Various"},
    {"id": "IN245", "name": "Progesterone 200mg", "genericName": "Progesterone", "code": "G03DA04", "form": "Capsule", "strengths": ["100mg", "200mg", "400mg"], "category": "Progestogen", "manufacturer": "Various"},

    # ── Miscellaneous ──
    {"id": "IN246", "name": "Methotrexate 2.5mg", "genericName": "Methotrexate", "code": "L01BA01", "form": "Tablet", "strengths": ["2.5mg", "5mg", "10mg"], "category": "DMARD / Immunosuppressant", "manufacturer": "Various"},
    {"id": "IN247", "name": "Allopurinol 100mg", "genericName": "Allopurinol", "code": "M04AA01", "form": "Tablet", "strengths": ["100mg", "300mg"], "category": "Antigout (Uricosuric)", "manufacturer": "Various"},
    {"id": "IN248", "name": "Colchicine 0.5mg", "genericName": "Colchicine", "code": "M04AC01", "form": "Tablet", "strengths": ["0.5mg"], "category": "Antigout", "manufacturer": "Various"},
    {"id": "IN249", "name": "Febuxostat 40mg", "genericName": "Febuxostat", "code": "M04AA03", "form": "Tablet", "strengths": ["40mg", "80mg"], "category": "Antigout (XO Inhibitor)", "manufacturer": "Various"},
    {"id": "IN250", "name": "Chlorhexidine Mouth Wash", "genericName": "Chlorhexidine Gluconate", "code": "A01AB03", "form": "Mouth Wash", "strengths": ["0.2%"], "category": "Oral Antiseptic", "manufacturer": "Various"},
    {"id": "IN251", "name": "Povidone Iodine 5% Solution", "genericName": "Povidone Iodine", "code": "D08AG02", "form": "Solution", "strengths": ["5%", "10%"], "category": "Antiseptic", "manufacturer": "Various"},
    {"id": "IN252", "name": "Lignocaine 2% Inj", "genericName": "Lidocaine Hydrochloride", "code": "N01BB02", "form": "Injection", "strengths": ["2%"], "category": "Local Anaesthetic", "manufacturer": "Various"},
    {"id": "IN253", "name": "Bupivacaine 0.5% Inj", "genericName": "Bupivacaine", "code": "N01BB01", "form": "Injection", "strengths": ["0.25%", "0.5%"], "category": "Local Anaesthetic", "manufacturer": "Various"},
    {"id": "IN254", "name": "Propofol 1% Inj", "genericName": "Propofol", "code": "N01AX10", "form": "Injection", "strengths": ["10mg/ml"], "category": "General Anaesthetic", "manufacturer": "Various"},
    {"id": "IN255", "name": "Ketamine 50mg/ml Inj", "genericName": "Ketamine", "code": "N01AX03", "form": "Injection", "strengths": ["50mg/ml"], "category": "Dissociative Anaesthetic", "manufacturer": "Various"},
    {"id": "IN256", "name": "Succinylcholine 100mg Inj", "genericName": "Suxamethonium", "code": "M03AB01", "form": "Injection", "strengths": ["100mg/2ml"], "category": "Depolarizing NMB", "manufacturer": "Various"},
    {"id": "IN257", "name": "Atracurium 25mg Inj", "genericName": "Atracurium", "code": "M03AC04", "form": "Injection", "strengths": ["25mg/2.5ml"], "category": "Non-depolarizing NMB", "manufacturer": "Various"},
    {"id": "IN258", "name": "Neostigmine 0.5mg Inj", "genericName": "Neostigmine", "code": "N07AA01", "form": "Injection", "strengths": ["0.5mg/ml", "2.5mg/ml"], "category": "Anticholinesterase", "manufacturer": "Various"},
    {"id": "IN259", "name": "Glycopyrrolate 0.2mg Inj", "genericName": "Glycopyrronium Bromide", "code": "A03AB02", "form": "Injection", "strengths": ["0.2mg/ml"], "category": "Anticholinergic", "manufacturer": "Various"},
    {"id": "IN260", "name": "Pheniramine Maleate 22.75mg Inj", "genericName": "Pheniramine Maleate", "code": "R06AB05", "form": "Injection", "strengths": ["22.75mg/ml"], "category": "Antihistamine (Injectable)", "manufacturer": "Various"},
    {"id": "IN261", "name": "Dexamethasone 4mg Inj", "genericName": "Dexamethasone Sodium Phosphate", "code": "H02AB02", "form": "Injection", "strengths": ["4mg/ml"], "category": "Corticosteroid (Injectable)", "manufacturer": "Various"},
    {"id": "IN262", "name": "Methylprednisolone 500mg Inj", "genericName": "Methylprednisolone Sodium Succinate", "code": "H02AB04", "form": "Injection", "strengths": ["40mg", "125mg", "500mg", "1g"], "category": "Corticosteroid (Injectable)", "manufacturer": "Various"},
    {"id": "IN263", "name": "Pantoprazole 40mg Inj", "genericName": "Pantoprazole Sodium", "code": "A02BC02", "form": "Injection", "strengths": ["40mg"], "category": "PPI (Injectable)", "manufacturer": "Various"},
    {"id": "IN264", "name": "Ondansetron 4mg Inj", "genericName": "Ondansetron", "code": "A04AA01", "form": "Injection", "strengths": ["2mg/ml", "4mg/2ml"], "category": "Antiemetic (Injectable)", "manufacturer": "Various"},
    {"id": "IN265", "name": "Metoclopramide 10mg Inj", "genericName": "Metoclopramide", "code": "A03FA01", "form": "Injection", "strengths": ["10mg/2ml"], "category": "Antiemetic (Injectable)", "manufacturer": "Various"},
    {"id": "IN266", "name": "Furosemide 20mg Inj", "genericName": "Furosemide", "code": "C03CA01", "form": "Injection", "strengths": ["20mg/2ml"], "category": "Loop Diuretic (Injectable)", "manufacturer": "Various"},
    {"id": "IN267", "name": "Aminophylline 250mg Inj", "genericName": "Aminophylline", "code": "R03DA05", "form": "Injection", "strengths": ["250mg/10ml"], "category": "Xanthine (Injectable)", "manufacturer": "Various"},
    {"id": "IN268", "name": "Diclofenac 75mg Inj", "genericName": "Diclofenac Sodium", "code": "M01AB05", "form": "Injection", "strengths": ["75mg/3ml"], "category": "NSAID (Injectable)", "manufacturer": "Various"},
    {"id": "IN269", "name": "Paracetamol 1g IV", "genericName": "Paracetamol", "code": "N02BE01", "form": "IV Infusion", "strengths": ["1g/100ml"], "category": "Analgesic (IV)", "manufacturer": "Various"},
    {"id": "IN270", "name": "Ranitidine 50mg Inj", "genericName": "Ranitidine", "code": "A02BA02", "form": "Injection", "strengths": ["50mg/2ml"], "category": "H2 Blocker (Injectable)", "manufacturer": "Various"},

    # ── Anti-TB ──
    {"id": "IN271", "name": "Rifampicin 450mg", "genericName": "Rifampicin", "code": "J04AB02", "form": "Capsule", "strengths": ["150mg", "300mg", "450mg", "600mg"], "category": "Anti-Tubercular", "manufacturer": "Various"},
    {"id": "IN272", "name": "Isoniazid 300mg", "genericName": "Isoniazid", "code": "J04AC01", "form": "Tablet", "strengths": ["100mg", "300mg"], "category": "Anti-Tubercular", "manufacturer": "Various"},
    {"id": "IN273", "name": "Pyrazinamide 500mg", "genericName": "Pyrazinamide", "code": "J04AK01", "form": "Tablet", "strengths": ["500mg", "750mg"], "category": "Anti-Tubercular", "manufacturer": "Various"},
    {"id": "IN274", "name": "Ethambutol 400mg", "genericName": "Ethambutol", "code": "J04AK02", "form": "Tablet", "strengths": ["200mg", "400mg", "800mg"], "category": "Anti-Tubercular", "manufacturer": "Various"},
    {"id": "IN275", "name": "RHZE Kit (4-FDC)", "genericName": "Rifampicin+Isoniazid+Pyrazinamide+Ethambutol", "code": "J04AM06", "form": "Tablet Kit", "strengths": ["FDC"], "category": "Anti-Tubercular (FDC)", "manufacturer": "Various"},
    {"id": "IN276", "name": "Streptomycin 750mg Inj", "genericName": "Streptomycin", "code": "J04AM01", "form": "Injection", "strengths": ["750mg", "1g"], "category": "Anti-Tubercular (Injectable)", "manufacturer": "Various"},
]


class MCPService:
    """MCP Service for medication operations with Indian market drug database."""

    # Drug interactions database
    DRUG_INTERACTIONS = {
        ("IN006", "IN101"): {"severity": "moderate", "description": "Ibuprofen may reduce the antiplatelet effect of Aspirin", "recommendation": "Take Aspirin at least 30 minutes before Ibuprofen"},
        ("IN059", "IN006"): {"severity": "mild", "description": "NSAIDs may slightly reduce the hypoglycemic effect of Metformin", "recommendation": "Monitor blood glucose levels"},
        ("IN079", "IN059"): {"severity": "moderate", "description": "Both medications can affect kidney function", "recommendation": "Monitor renal function regularly"},
        ("IN105", "IN009"): {"severity": "high", "description": "Diclofenac increases Warfarin bleeding risk", "recommendation": "Avoid combination or monitor INR closely"},
        ("IN105", "IN101"): {"severity": "high", "description": "Aspirin with Warfarin significantly increases bleeding risk", "recommendation": "Use with extreme caution; monitor INR frequently"},
        ("IN074", "IN082"): {"severity": "mild", "description": "Both lower blood pressure; additive hypotensive effect", "recommendation": "Monitor blood pressure regularly"},
        ("IN096", "IN040"): {"severity": "moderate", "description": "Fluconazole inhibits CYP3A4 and increases statin levels", "recommendation": "Monitor for signs of rhabdomyolysis"},
        ("IN059", "IN088"): {"severity": "mild", "description": "Furosemide may increase risk of Metformin-associated lactic acidosis", "recommendation": "Ensure adequate hydration"},
        ("IN152", "IN221"): {"severity": "moderate", "description": "SSRIs with Tramadol increase serotonin syndrome risk", "recommendation": "Monitor for serotonin syndrome symptoms"},
        ("IN019", "IN105"): {"severity": "moderate", "description": "Azithromycin may increase Warfarin effect", "recommendation": "Monitor INR when starting/stopping azithromycin"},
    }

    def __init__(self, endpoint_url: Optional[str] = None, api_key: Optional[str] = None):
        self.endpoint_url = endpoint_url
        self.api_key = api_key
        self.client = httpx.AsyncClient() if endpoint_url else None

    @staticmethod
    def get_all_medications() -> List[Dict[str, Any]]:
        """Return the full cached Indian medications list."""
        global _medication_cache
        if not _medication_cache:
            _medication_cache = INDIAN_MEDICATIONS_DB.copy()
        return _medication_cache

    async def search_medications(
        self,
        query: str,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search medications by name, generic name, code, or category.

        Search-engine style: returns suggestions as the doctor types.
        Search order:
        1. Local Indian market database (276+ drugs, instant)
        2. RxNorm API (free, no key required, ~10k+ drugs)
        3. Groq LLM fallback (Indian market aware, for anything not found above)
        All results are cached in-memory for fast repeat queries.
        """
        global _llm_search_cache

        if not query or not query.strip():
            # Return popular medications when no query (common prescriptions)
            return self.get_all_medications()[:limit]

        query_lower = query.strip().lower()

        # Check cache first
        if query_lower in _llm_search_cache:
            return _llm_search_cache[query_lower][:limit]

        # Local fuzzy search across all fields
        exact_matches = []
        starts_with = []
        contains = []

        for med in self.get_all_medications():
            name_lower = med["name"].lower()
            generic_lower = med["genericName"].lower()
            code_lower = med["code"].lower()
            category_lower = med["category"].lower()
            manufacturer_lower = med.get("manufacturer", "").lower()

            if query_lower == name_lower or query_lower == generic_lower:
                exact_matches.append(med)
            elif name_lower.startswith(query_lower) or generic_lower.startswith(query_lower):
                starts_with.append(med)
            elif (query_lower in name_lower or
                  query_lower in generic_lower or
                  query_lower in code_lower or
                  query_lower in category_lower or
                  query_lower in manufacturer_lower):
                contains.append(med)

        results = exact_matches + starts_with + contains

        # Only call external APIs when NO local results and query is long enough
        if len(results) == 0 and len(query_lower) >= 3:
            import asyncio
            tasks = []

            # RxNorm search
            tasks.append(self._rxnorm_search(query_lower))

            # LLM search for Indian market drugs
            if settings.GROQ_API_KEY:
                tasks.append(self._llm_medication_search(query_lower))

            api_results = await asyncio.gather(*tasks, return_exceptions=True)

            existing_names = {r["name"].lower() for r in results}
            for result_set in api_results:
                if isinstance(result_set, Exception):
                    continue
                for med in result_set:
                    if med["name"].lower() not in existing_names:
                        results.append(med)
                        existing_names.add(med["name"].lower())

        # Cache the results
        if results:
            _llm_search_cache[query_lower] = results

        return results[:limit]

    async def _rxnorm_search(self, query: str) -> List[Dict[str, Any]]:
        """Search RxNorm API (free, no API key required) for drugs."""
        results = []
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                # Use the getDrugs endpoint which returns drug products by name
                response = await client.get(
                    "https://rxnav.nlm.nih.gov/REST/drugs.json",
                    params={"name": query}
                )
                if response.status_code != 200:
                    return []

                data = response.json()
                drug_group = data.get("drugGroup", {})
                concept_groups = drug_group.get("conceptGroup", [])

                seen_names = set()
                for cg in concept_groups:
                    for concept in cg.get("conceptProperties", []):
                        name = concept.get("name", "")
                        rxcui = concept.get("rxcui", "")
                        tty = concept.get("tty", "")  # term type

                        # Filter to useful term types (SBD=branded, SCD=clinical drug, etc.)
                        if tty not in ("SBD", "SCD", "GPCK", "BPCK", "IN", "BN", "MIN", "PIN"):
                            continue

                        # Skip if already seen (dedup by lowercase name)
                        name_key = name.lower()
                        if name_key in seen_names:
                            continue
                        seen_names.add(name_key)

                        # Determine form from name
                        form = "Tablet"
                        name_upper = name.upper()
                        if "INJECT" in name_upper or "INJ" in name_upper:
                            form = "Injection"
                        elif "CAPSULE" in name_upper or "CAP" in name_upper:
                            form = "Capsule"
                        elif "SYRUP" in name_upper or "ORAL SOLUTION" in name_upper or "SUSPENSION" in name_upper:
                            form = "Syrup/Solution"
                        elif "CREAM" in name_upper:
                            form = "Cream"
                        elif "OINTMENT" in name_upper:
                            form = "Ointment"
                        elif "INHALER" in name_upper or "INHALATION" in name_upper:
                            form = "Inhaler"
                        elif "PATCH" in name_upper:
                            form = "Patch"
                        elif "DROP" in name_upper:
                            form = "Drops"
                        elif "SPRAY" in name_upper:
                            form = "Spray"

                        # Map TTY to category hint
                        category = ""
                        if tty in ("IN", "MIN", "PIN"):
                            category = "Ingredient"
                        elif tty == "BN":
                            category = "Brand Name"
                        elif tty == "SCD":
                            category = "Clinical Drug"
                        elif tty == "SBD":
                            category = "Branded Drug"

                        med = {
                            "id": f"rx_{rxcui}",
                            "name": name,
                            "genericName": concept.get("synonym", name),
                            "code": rxcui,
                            "form": form,
                            "strengths": [],
                            "category": category,
                            "manufacturer": "",
                            "source": "rxnorm"
                        }
                        results.append(med)

                        if len(results) >= 20:
                            break
                    if len(results) >= 20:
                        break

                # Add RxNorm results to global cache for future queries
                global _medication_cache
                for r in results:
                    if not any(m["name"].lower() == r["name"].lower() for m in _medication_cache):
                        _medication_cache.append(r)

        except Exception as e:
            logger.warning(f"RxNorm API search failed: {e}")

        return results

    async def _llm_medication_search(self, query: str) -> List[Dict[str, Any]]:
        """Use Groq LLM to find medications when local search fails."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": settings.GROQ_MODEL,
                        "messages": [
                            {
                                "role": "system",
                                "content": (
                                    "You are a pharmaceutical database assistant specializing in Indian market medications. "
                                    "Given a search query, return a JSON array of matching medications commonly available in Indian pharmacies. "
                                    "Include both branded names (e.g., Dolo 650, Augmentin, Crocin) and generic names. "
                                    "Include popular Indian brands from companies like Cipla, Sun Pharma, Dr Reddy's, Lupin, Zydus, Mankind, Alkem, Torrent, Glenmark, Ipca, Abbott India, etc. "
                                    "Each object must have: name (brand name with strength), genericName (salt/composition), form (Tablet/Capsule/Syrup/Injection/Cream/etc), strengths (array of available strengths), category (therapeutic class), manufacturer (company name). "
                                    "Return ONLY the JSON array, no markdown or extra text. Max 15 results. "
                                    "Prioritize commonly prescribed medications in Indian clinical practice."
                                )
                            },
                            {
                                "role": "user",
                                "content": f"Search for medications matching: {query}"
                            }
                        ],
                        "temperature": 0.1,
                        "max_tokens": 2048
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"].strip()

                # Parse JSON from LLM response
                if content.startswith("```"):
                    content = content.split("```")[1]
                    if content.startswith("json"):
                        content = content[4:]
                    content = content.strip()

                meds = json.loads(content)
                results = []
                for i, med in enumerate(meds):
                    results.append({
                        "id": f"llm_{i}",
                        "name": med.get("name", "Unknown"),
                        "genericName": med.get("genericName", med.get("name", "")),
                        "code": med.get("code", ""),
                        "form": med.get("form", "Tablet"),
                        "strengths": med.get("strengths", []),
                        "category": med.get("category", ""),
                        "manufacturer": med.get("manufacturer", "Various"),
                        "source": "llm"
                    })

                # Add LLM results to the global cache so they appear in future searches
                global _medication_cache
                for r in results:
                    if not any(m["name"].lower() == r["name"].lower() for m in _medication_cache):
                        _medication_cache.append(r)

                return results
        except Exception as e:
            logger.warning(f"LLM medication search failed: {e}")
            return []

    async def get_medication(self, drug_id: str) -> Optional[Dict[str, Any]]:
        """Get medication details by ID."""
        for med in self.get_all_medications():
            if med["id"] == drug_id:
                return med
        return None

    async def check_interactions(
        self,
        drug_id: str,
        current_medications: List[str]
    ) -> List[Dict[str, Any]]:
        """Check drug interactions."""
        interactions = []

        for other_drug in current_medications:
            key1 = (drug_id, other_drug)
            key2 = (other_drug, drug_id)

            if key1 in self.DRUG_INTERACTIONS:
                interaction = self.DRUG_INTERACTIONS[key1].copy()
                interaction["drug1"] = drug_id
                interaction["drug2"] = other_drug
                interactions.append(interaction)
            elif key2 in self.DRUG_INTERACTIONS:
                interaction = self.DRUG_INTERACTIONS[key2].copy()
                interaction["drug1"] = other_drug
                interaction["drug2"] = drug_id
                interactions.append(interaction)

        return interactions

    async def close(self):
        """Close HTTP client."""
        if self.client:
            await self.client.aclose()
