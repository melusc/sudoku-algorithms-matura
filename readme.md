# Readme

## Paths

### [`generated/`][]

All sudokus generated for the thesis. Each line is a sudoku that can be passed to `Sudoku.fromString`.

### [`combinations/`][]

For all sudokus the combination of plugins used, if they could solve the sudoku, how many rounds they took etc. See <https://github.com/melusc/sudoku-algorithms-matura/blob/main/src/try-combinations.ts#L144-L170> for more details.

### [`stats/`][]

Contains statistics using [`combinations/`][]

#### [`stats/unsolved.csv`][] & [`stats/unsolved.json`][]

Statistics about the unsolved sudokus:

- How many sudokus were unsolved?
- How complete were the sudokus after trying to solve? (completeness)
- How many rounds did all five plugins take to solve the unsolved sudokus?
- How complete was the sudoku initially?

#### [`stats/amount-solved.csv`][] & [`stats/amount-solved.json`][]

Contain statistics about the solved sudokus:

- How many sudokus were solved?

#### [`stats/rounds.csv`][] & [`stats/rounds.json`][]

Statistics about the amount of rounds solved sudokus took to solve:

- How many rounds, on average, did the plugins take to solve the sudokus?
- What was the median of the rounds they took?
- What is the greatest and lowest amount of rounds they took?
- What was the average rounds all five plugins take to solve the sudokus?

#### [`stats/n-fish-from-initial.json`]

The before and after for all sudokus (in their initial state) where N-Fish was able to find a match and remove candidates as a result.

#### [`stats/n-fish-stats.csv`]

For all sudokus that N-Fish and other plugins were able to solve:

- How many matches did N-Fish find? (`totalMatches`)
- How many matches did N-Fish that lead to candidates being removed? (`usefulMatches`)

[`combinations/`]: ./combinations/
[`generated/`]: ./generated/
[`stats/`]: ./stats/
[`stats/unsolved.csv`]: ./stats/unsolved.csv
[`stats/unsolved.json`]: ./stats/unsolved.json
[`stats/amount-solved.csv`]: ./stats/amount-solved.csv
[`stats/amount-solved.json`]: ./stats/amount-solved.json
[`stats/amount-solved.csv`]: ./stats/amount-solved.csv
[`stats/rounds.json`]: ./stats/rounds.json
[`stats/rounds.csv`]: ./stats/rounds.csv
[`stats/n-fish-stats.csv`]: ./stats/n-fish-stats.csv
[`stats/n-fish-from-initial.json`]: ./stats/n-fish-from-initial.json
