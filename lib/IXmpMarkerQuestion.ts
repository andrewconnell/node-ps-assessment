/**
 * Interface for the string found within a marker from an Adobe XMP file. The string
 * is parsed into two things: the question followed by an array of correct &
 * incorrect answer options.
 */
interface IXmpMarkerQuestion {
  /**
   * Question in the XMP marker.
   */
  question:string;

  /**
   * Array of answer strings in the XMP marker
   */
  answers:string[];
}

export = IXmpMarkerQuestion;