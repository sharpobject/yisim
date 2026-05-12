# Card Rules Text Height Model

This records the TextMeshPro spacing model used for card rules text and how it
relates to the per-line-count tuning values in
`render_rule_sky_sword_formation.py`.

## TextMeshPro Values

The default TMP font asset currently reports:

- `pointSize = 30`
- `m_LineHeight = 32.55000305175781`
- `m_AscentLine = 26.55000114440918`
- `m_DescentLine = -6.0`

The card rules text object uses:

- `m_lineSpacing = -6.0`
- `m_paragraphSpacing = 9.0`

TMP applies these spacing values as percentages of the current font size:

```text
line_advance_px = round((m_LineHeight + m_lineSpacing * pointSize * 0.01) * fontSize / pointSize)
paragraph_gap_px = ceil(m_paragraphSpacing * fontSize * 0.01)
```

At the font asset point size, the default soft-wrap line advance is:

```text
32.55000305175781 + (-6.0 * 30 * 0.01) = 30.75000305175781 units
```

An explicit newline adds:

```text
9.0 * 30 * 0.01 = 2.7 units
```

So the default total height unit count for a rules text group is:

```text
default_total_units = n_lines * 30.75000305175781 + n_explicit_newlines * 2.7
```

For a group with a tuned `line_spacing`, the analogous learned total is:

```text
learned_total_units =
    n_lines * (32.55000305175781 + tuned_line_spacing * 30 * 0.01)
    + n_explicit_newlines * 2.7
```

## Generated Diagnostics

Run:

```bash
scrape/.venv/bin/python scrape/plot_rules_text_height_tuning.py
```

This writes:

- `scrape/extracted_assets/001.0006.0014/rendered_cards/rule_sky_sword_formation/diffs/rules_text_height_tuning.csv`
- `scrape/extracted_assets/001.0006.0014/rendered_cards/rule_sky_sword_formation/diffs/rules_text_height_tuning.svg`

The SVG plots default total text-height units on the x axis against each learned
per-group rendering parameter.
