# What we got wrong

## Training compute kept accelerating for too long

**The mistake:** The time chart continued a temporary training boost after its end.

**How we found it:** We compared the calculation before and after the compute-change period.

**The fix:** Training growth returns to its baseline pace when that period ends. The calculation keeps the progress already made.

## Later results could hide an earlier limit

**The mistake:** The text showed a year-five labour result even when the chart had stopped earlier because no amount of labour could reach the target.

**How we found it:** We checked a case where a temporary training cut made the target impossible at first but possible later.

**The fix:** The text, chart and sensitivity explanation now follow the same path and stop at its first limit.

## The chart placed limits too late

**The mistake:** The chart reported the first sampled year beyond a limit, rather than the year the limit began.

**How we found it:** Changing the spacing between samples changed the reported year.

**The fix:** The calculation searches between samples for the crossing. It also checks the start and the end of a temporary training change.

## Large numbers broke otherwise valid charts

**The mistake:** Chart arithmetic could overflow even when the model returned a finite number. Extreme inputs could also produce unreadable results.

**How we found it:** Review checked values near the largest number the calculation can hold and very low substitution between labour and experiments.

**The fix:** Chart ticks use arithmetic that avoids the overflow. Results beyond the numeric range receive a written explanation. Separate checks cover extreme cases where reversing a calculation loses precision.

## Rounded numbers looked exact

**The mistake:** Rounded substitutions used an equals sign, and static and live results used different precision.

**How we found it:** We compared the equations and the starting page with the live calculations.

**The fix:** Rounded substitutions use an approximation sign. Static results come from the live renderer, and result displays share the same precision.

## Explanations blamed the wrong cause

**The mistake:** A result with no progress could blame a training cut even when the result would remain nonpositive without that cut. Different parts of the diagram could also disagree about whether progress had stopped.

**How we found it:** We restored training compute while holding the other inputs fixed, then compared the diagram nodes and readout.

**The fix:** The explanation checks whether the cut caused the result. The diagram and readout use the same reported index to decide whether there is progress. Nonpositive results receive words rather than misleading speedup labels.

## The page overstated what the sources established

**The mistake:** The introduction attributed too many assumptions to the starting model and did not explain the benchmark uncertainty clearly enough.

**How we found it:** Review compared the page's claims with its source attributions and the assumptions used in the calculation.

**The fix:** The page separates the starting model from our compute split, time path and other extensions. It states the benchmark interval, uncertainty, AI-share assumption and falling-productivity caveat. The time chart explains its dependence on the illustrative baseline pace.

## Some equations lacked the explanation needed to read them

**The mistake:** The page did not fully explain the growth split, compute timing, index conversion or the conditions under which labour and experiments can replace each other.

**How we found it:** Review read each formula alongside its symbol definitions and plain-English explanation.

**The fix:** Each card explains its own assumptions. Help distinguishes the old and new experiment shares, states when a dial's effect changes direction, and covers the symbols used in intermediate steps. The research card distinguishes Cobb-Douglas from CES. The time card explains both constant productivity and the possible labour drop after a training cut ends.

## Symbol help could close as soon as it opened

**The mistake:** Focus opened help before the click closed it again. Closing help could reopen it by restoring focus, and scrolling its text could dismiss it.

**How we found it:** Interaction checks followed focus, click, close and scroll in order.

**The fix:** Opening help twice keeps it open. Restoring focus after dismissal does not reopen it. Scrolling inside the explanation keeps it visible, and keyboard focus retains help during page movement.

## Symbol help sometimes showed the wrong value

**The mistake:** A symbol in the target calculation could show the forward input instead of the value needed for the target.

**How we found it:** We changed forward labour while leaving the target unchanged.

**The fix:** Help reads values from the equation's context. Target labour, research output and software pace now come from the target calculation.

## Keyboard access and open explanations did not survive updates

**The mistake:** Rerendering collapsed some explanations. Some formula symbols were hard to reach with the keyboard, and equations had weak hover feedback.

**How we found it:** We opened explanations, changed inputs and moved through the formula symbols by keyboard.

**The fix:** Cards and derivations retain their open state, including when the number of steps changes. Arrow keys move through symbols, and symbols underline on hover or focus. Standalone explanatory equations share the same keyboard handling.

## Moving one dial looked like changing two settings

**The mistake:** The experiment-compute dial changes two internal settings, so the changed-setting count could count one action twice.

**How we found it:** We compared experiment-dial changes with direct compute and share changes, including repeated moves and a return to defaults.

**The fix:** The count groups the changes caused by that dial while retaining separate direct changes. Comment exports describe experiment compute as E when training compute stays on its baseline path.

## Updating the page interrupted typing and animation

**The mistake:** A redraw could erase an unfinished decimal and restart every moving dot.

**How we found it:** We typed decimal values during updates and compared dot positions before and after a change.

**The fix:** Active number fields retain their text. Diagram values update in place, and moving dots retain their distance while their speed changes. Reduced-motion views keep the dots still.

## The starting page did not explain its result soon enough

**The mistake:** Readers reached the controls before seeing the starting model's implication. A generated scenario list also joined some labels directly to their numbers.

**How we found it:** Review followed the page from the introduction through the examples and compared the live and static versions.

**The fix:** The introduction shows results for the starting, doubled and doubled-again pace. These results stay fixed when the dials move. Static examples separate their names and values clearly.

## The page was confusing when scripts did not run

**The mistake:** Unusable controls remained visible, and a warning only appeared when JavaScript was disabled. A failed script download could leave no explanation.

**How we found it:** We checked the static markup and the rules that hide interactive controls.

**The fix:** The static page keeps both reading views and their starting results, hides unusable controls, and shows a warning until startup succeeds. Its guide omits promises of hover help and live updates.

## Diagram layout and navigation hid information

**The mistake:** Image semantics hid diagram links, deep links could lose their destination, phone navigation could cover targets, and a pipe at the canvas edge could lose half its stroke. A nested chart also inherited the wrong size.

**How we found it:** Review inspected link access, equation destinations, phone geometry and nested diagram sizing.

**The fix:** Diagram links have accessible names. Reloads and navigation retain equation destinations. Phone targets have room above them, edge pipes sit inside the canvas, and only the outer diagram receives the canvas sizing rule. Power expressions keep their bases together and retain variable italics.

## Result styling obscured meaning

**The mistake:** Reference lines shared a style, the meter was faint in dark mode, and uncertainty sat too far from the result. Some derivations repeated results or used awkward signs and punctuation.

**How we found it:** Review compared the chart references, diagram markup and each result branch.

**The fix:** Chart references use distinct line styles. The meter has a clearer border and dark fill. Its uncertainty explanation sits beside it in both layouts. Derivations show one final result with consistent signs, punctuation and labels.

## The review panel could move outside the screen

**The mistake:** Moving comments above symbol help kept the panel's old height. Clicking Add a comment could dismiss help and move the button before the click finished.

**How we found it:** We checked the space above and below explanation sheets and traced the focus changes during a click.

**The fix:** The panel fits the available space and respects the shorter phone height limit. Pointer presses keep the comment button in place until its click opens the panel and dismisses help.

## Comment actions could erase unrelated work

**The mistake:** Deleting a saved comment cleared an unsaved draft. The location field could remain on the previous tab, and exported settings could describe a labour limit with an unexplained status label.

**How we found it:** We checked deletion while drafting or editing, switched reading tabs, and read the downloaded comments.

**The fix:** Deletion clears the form only when it contains that comment. Automatic locations follow tab changes until the reader edits the location. Exports explain unreachable targets and other special results in words, while preserving the saved calculation values.

## The review build depended on personal details and an earlier build

**The mistake:** Reviewer details were fixed in the source, and a test assumed the output folder already existed.

**How we found it:** We inspected the build inputs and the test's dependence on generated files.

**The fix:** The build accepts an optional reviewer name. Unnamed copies use a generic banner and an empty name field. Tests build their own copy in memory and do not depend on an existing output folder. Optional browser checks keep their generated files in the ignored QA folder.

## Outside review: the time path discarded periods below baseline

**The mistake:** We counted only extra software doublings above baseline. If software fell behind during a training-compute increase, the calculation discarded that shortfall. This understated later productivity and overstated the labour needed.

**How we found it:** An outside review reproduced the core model and found this error in our time-path extension. With four times the compute and a half-year transition, required software growth starts at 0.5 times baseline, then rises to 2.5. The signed difference after five years is 13 doublings.

**The fix:** The difference can now be negative. When it is, research productivity rises above its starting ratio. This example needs about 141.42 times baseline labour at year five. The default remains about 1,131.37, and doubling all compute over one year gives 400. The page rounds the five-year display to at most three significant figures.

## Outside review: the lab could produce more than the target required

**The mistake:** The time path used required growth even when experiment compute could produce faster growth with no labour. It then understated the extra software doublings and their effect on productivity.

**How we found it:** The outside review tested substitution of 2, eight times the compute and a two-year transition. Required growth starts at 1.75, but zero-labour growth is already 2.

**The fix:** The path uses the larger of required growth and growth at zero labour. Exact solutions cover each phase and the point where the binding condition changes. Tests compare them with a separate numerical integration. The chart, card and sensitivity note share each state's path result, and the search for the first labour wall remains in place.

## Outside review: compute labels mixed current use with effects on models

**The mistake:** Our labels suggested that experiment compute and training compute showing in models were two current allocations that must add up to the pool. The training effect arrives over a transition, so those quantities can refer to different stages.

**How we found it:** The outside review checked the meaning of the compute ratios against the transition equations.

**The fix:** The page states that experiment compute is in use now, while the training ratio measures compute already showing in models. Short readouts identify faster training growth as occurring during the transition.

## Outside review: the AI share did not identify actual labour uplift

**The mistake:** Our readouts described the labour equivalent of AI's attributed part as if it identified the actual uplift. The model does not say where other causes of faster progress act. Our headline also omitted the model attribution, and the baseline wording did not explain the assumed continuation.

**How we found it:** The outside review compared different explanations for the same reported pace. If other causes raise research productivity to 1.3 and AI supplies the rest of a doubled pace, the model needs about 3.698 times the labour. That differs from the 4.84 labour equivalent in the 80% attribution case.

**The fix:** Readouts, phone text, diagram descriptions and help state the attribution limit. The example is calculated by the engine. The headline names Tejas's model, and the baseline text explains that its continuation is assumed. The page also identifies the bridge, compute split and time path as our extensions and explains that the five-year chart is a sensitivity exercise.

## Outside review: labour and decline labels misdescribed the results

**The mistake:** We said that replacing human researchers with AI raised effective labour even when capacity was unchanged. Presets changed the target assumptions while leaving the forward labour dial at 6.25. We also labelled negative index growth as no progress, and called a productivity fall of 20% an increase in difficulty of 20%.

**How we found it:** The outside review checked the definitions, preset behaviour and negative-growth cases against the calculations.

**The fix:** Equal-capacity replacement now leaves effective labour unchanged in the explanation. Presets load their solved labour into the dial, with explicit handling for walls and zero labour. The dial and chart extend to 60. Negative growth is described as a decline; exactly zero remains no progress. The productivity preset now names the quantity that actually falls. All eleven starting preset answers remain unchanged.

## The spending puzzle: comparing with last year, not with the trend

**The mistake:** When charts set Anthropic's research spending against METR's capability trend, we compared this year's spending with last year's and concluded that research was scaling up badly. Our own model compares everything with the continuation of the old trend, and says so.

**How we found it:** Two fresh AI reviewers checked the draft. The second found that the comparison broke the model's own rule.

**The fix:** The draft was withdrawn before publication. The spending puzzle page compares spending with several possible trends instead.

## The spending puzzle: leaving out the least favourable trends

**The mistake:** Our first draft of the spending puzzle page showed only the spending trends that made Anthropic's spending look ordinary at the bend, and concluded that spending "did nothing unusual".

**How we found it:** A fresh AI reviewer recomputed trends from the same filing and found two that use only figures from before the bend, one of which puts spending at 2.75 times trend.

**The fix:** The page now shows six trends, including those, says that the past gives no stable trend, and no longer concludes that spending was ordinary.
