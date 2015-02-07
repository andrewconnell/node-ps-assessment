/**
 * Representation of the question object for each question within a module.
 */
interface IAssessmentQuestion {
  /**
   * Question part of the assessment question.
   */
  question:   string;

  /**
   * Array of answers for the question. Each string has a prefix character for correct ('*') or
   * incorrect ('-') answers.
   */
  answers:    string[];

  /**
   * Index number of the clip within the module.
   */
  clipNumber: number;

  /**
   * Timecode where the question appears the clip. This is typically only available when extracting
   * questions from Adobe XMP files.
   */
  timeCode:   string;

}

export = IAssessmentQuestion;
